import { useEffect, useMemo, useState } from 'react';
import { Bot as BotIcon, ChevronDown, ChevronRight, ExternalLink, Save, Undo2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGuildBots } from '../../hooks/useGuildBots';
import PairChanceMatrix, { type BotLite } from './PairChanceMatrix';
import type { GuildBotEntry, GuildBotSettings } from '../../types';

interface GuildBotsConfigFormProps {
  guildId: string;
}

/**
 * Form state uses strings for nullable numeric/text fields so an empty string
 * represents "inherit from bot default" (null). Converted in formToPatch.
 */
interface OverrideFormState {
  personalityOverride: string;
  responseChance: string;
  cooldownMs: string;
  replyOnlyMode: 'inherit' | 'true' | 'false';
  allowedChannels: string;
  botToBotEnabled: boolean;
  maxChainDepth: number;
  channelCooldownMs: number;
  circuitBreakerCount: number;
  circuitBreakerWindowMs: number;
  circuitBreakerPauseMs: number;
  mentionBypassMatrix: boolean;
}

const DEFAULT_OVERRIDES: OverrideFormState = {
  personalityOverride: '',
  responseChance: '',
  cooldownMs: '',
  replyOnlyMode: 'inherit',
  allowedChannels: '',
  botToBotEnabled: false,
  maxChainDepth: 3,
  channelCooldownMs: 5000,
  circuitBreakerCount: 10,
  circuitBreakerWindowMs: 60_000,
  circuitBreakerPauseMs: 300_000,
  mentionBypassMatrix: true,
};

function settingsToForm(s: GuildBotSettings | null): OverrideFormState {
  if (!s) return { ...DEFAULT_OVERRIDES };
  return {
    personalityOverride: s.personalityOverride ?? '',
    responseChance: s.responseChance == null ? '' : String(s.responseChance),
    cooldownMs: s.cooldownMs == null ? '' : String(s.cooldownMs),
    replyOnlyMode: s.replyOnlyMode == null ? 'inherit' : s.replyOnlyMode ? 'true' : 'false',
    allowedChannels: (s.allowedChannels || []).join(', '),
    botToBotEnabled: s.botToBotEnabled,
    maxChainDepth: s.maxChainDepth,
    channelCooldownMs: s.channelCooldownMs,
    circuitBreakerCount: s.circuitBreakerCount,
    circuitBreakerWindowMs: s.circuitBreakerWindowMs,
    circuitBreakerPauseMs: s.circuitBreakerPauseMs,
    mentionBypassMatrix: s.mentionBypassMatrix,
  };
}

function formToPatch(f: OverrideFormState): Partial<GuildBotSettings> {
  const trimChannels = f.allowedChannels
    .split(',')
    .map(c => c.trim())
    .filter(Boolean);
  const parseNumOrNull = (v: string): number | null => {
    if (v.trim() === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  return {
    personalityOverride: f.personalityOverride.trim() === '' ? null : f.personalityOverride,
    responseChance: parseNumOrNull(f.responseChance),
    cooldownMs: parseNumOrNull(f.cooldownMs),
    replyOnlyMode: f.replyOnlyMode === 'inherit' ? null : f.replyOnlyMode === 'true',
    allowedChannels: trimChannels,
    botToBotEnabled: f.botToBotEnabled,
    maxChainDepth: Number(f.maxChainDepth) || 0,
    channelCooldownMs: Number(f.channelCooldownMs) || 0,
    circuitBreakerCount: Number(f.circuitBreakerCount) || 0,
    circuitBreakerWindowMs: Number(f.circuitBreakerWindowMs) || 0,
    circuitBreakerPauseMs: Number(f.circuitBreakerPauseMs) || 0,
    mentionBypassMatrix: f.mentionBypassMatrix,
  };
}

function formsEqual(a: OverrideFormState, b: OverrideFormState): boolean {
  return (
    a.personalityOverride === b.personalityOverride &&
    a.responseChance === b.responseChance &&
    a.cooldownMs === b.cooldownMs &&
    a.replyOnlyMode === b.replyOnlyMode &&
    a.allowedChannels === b.allowedChannels &&
    a.botToBotEnabled === b.botToBotEnabled &&
    Number(a.maxChainDepth) === Number(b.maxChainDepth) &&
    Number(a.channelCooldownMs) === Number(b.channelCooldownMs) &&
    Number(a.circuitBreakerCount) === Number(b.circuitBreakerCount) &&
    Number(a.circuitBreakerWindowMs) === Number(b.circuitBreakerWindowMs) &&
    Number(a.circuitBreakerPauseMs) === Number(b.circuitBreakerPauseMs) &&
    a.mentionBypassMatrix === b.mentionBypassMatrix
  );
}

function buildInviteUrl(discordAppId: string, guildId: string): string {
  const params = new URLSearchParams({
    client_id: discordAppId,
    scope: 'bot applications.commands',
    permissions: '8',
    guild_id: guildId,
    disable_guild_select: 'true',
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

function statusPill(status: string) {
  const base = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-mono uppercase tracking-wide';
  switch (status) {
    case 'ENABLED':
      return <span className={`${base} bg-green-900/40 text-green-300 border border-green-700/50`}>Enabled</span>;
    case 'DISABLED':
      return <span className={`${base} bg-gray-700/40 text-gray-300 border border-gray-600/50`}>Disabled</span>;
    case 'TOKEN_INVALID':
      return <span className={`${base} bg-red-900/40 text-red-300 border border-red-700/50`}>Token Invalid</span>;
    case 'UNHEALTHY':
      return <span className={`${base} bg-yellow-900/40 text-yellow-300 border border-yellow-700/50`}>Unhealthy</span>;
    default:
      return <span className={`${base} bg-gray-700/40 text-gray-300 border border-gray-600/50`}>{status}</span>;
  }
}

interface BotCardProps {
  entry: GuildBotEntry;
  guildId: string;
  onUpdate: (botId: string, patch: Partial<GuildBotSettings>) => Promise<void>;
}

function BotCard({ entry, guildId, onUpdate }: BotCardProps) {
  const { bot, settings, presentInGuild } = entry;
  const [expanded, setExpanded] = useState(false);
  const [savingToggle, setSavingToggle] = useState(false);
  const [savingOverrides, setSavingOverrides] = useState(false);

  const baseline = useMemo(() => settingsToForm(settings), [settings]);
  const [form, setForm] = useState<OverrideFormState>(baseline);

  useEffect(() => {
    setForm(baseline);
  }, [baseline]);

  const dirty = !formsEqual(form, baseline);
  const enabled = !!settings?.enabled;

  const handleToggle = async () => {
    if (!presentInGuild) return;
    setSavingToggle(true);
    try {
      await onUpdate(bot.id, { enabled: !enabled });
      toast.success(`${bot.name} ${!enabled ? 'enabled' : 'disabled'}`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      toast.error(err?.response?.data?.error || err?.message || 'Failed to toggle bot');
    } finally {
      setSavingToggle(false);
    }
  };

  const handleSaveOverrides = async () => {
    setSavingOverrides(true);
    try {
      await onUpdate(bot.id, formToPatch(form));
      toast.success(`${bot.name} settings saved`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      toast.error(err?.response?.data?.error || err?.message || 'Failed to save settings');
    } finally {
      setSavingOverrides(false);
    }
  };

  const handleRevert = () => {
    setForm(baseline);
    toast.success('Changes reverted');
  };

  const inviteUrl = buildInviteUrl(bot.discordAppId, guildId);

  const inputCls =
    'w-full bg-discord-gray border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-discord-blurple text-sm';
  const labelCls = 'block text-xs font-medium text-gray-300 mb-1';
  const helpCls = 'text-xs text-gray-500 mt-1';

  return (
    <div
      data-testid={`bot-card-${bot.id}`}
      className="bg-discord-dark rounded-lg border border-gray-700 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-full bg-discord-blurple flex items-center justify-center text-white shrink-0">
            <BotIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-white font-medium truncate">{bot.name}</h4>
              {statusPill(bot.status)}
              {presentInGuild ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-900/30 text-blue-300 border border-blue-700/50">
                  In server
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-orange-900/30 text-orange-300 border border-orange-700/50">
                  Not in server
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 font-mono truncate">App ID: {bot.discordAppId}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {presentInGuild ? (
            <button
              type="button"
              data-testid={`bot-enable-toggle-${bot.id}`}
              onClick={handleToggle}
              disabled={savingToggle}
              aria-pressed={enabled}
              aria-label={`Toggle ${bot.name}`}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                enabled ? 'bg-discord-blurple' : 'bg-gray-600'
              } ${savingToggle ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          ) : (
            <a
              data-testid={`bot-invite-link-${bot.id}`}
              href={inviteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-discord-blurple hover:bg-discord-blurple-dark text-white px-3 py-1.5 rounded-lg transition text-sm font-medium"
            >
              <ExternalLink className="h-4 w-4" />
              Invite
            </a>
          )}

          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            disabled={!presentInGuild}
            aria-expanded={expanded}
            aria-controls={`bot-settings-${bot.id}`}
            className={`p-2 rounded-lg transition text-gray-300 ${
              presentInGuild ? 'hover:bg-discord-gray' : 'opacity-30 cursor-not-allowed'
            }`}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {!presentInGuild && (
        <div className="px-4 pb-3 -mt-1 flex items-start gap-2 text-xs text-orange-200/80">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            This bot isn't in your server yet. Click <strong>Invite</strong> to add it; once it joins, you can enable
            and configure it here.
          </span>
        </div>
      )}

      {expanded && presentInGuild && (
        <div
          id={`bot-settings-${bot.id}`}
          className="px-4 py-4 border-t border-gray-700 bg-discord-gray/30 space-y-5"
        >
          <div className="space-y-4">
            <h5 className="text-sm font-semibold text-white">Per-guild overrides</h5>
            <p className="text-xs text-gray-400 -mt-3">
              Leave fields blank to inherit the bot's global default.
            </p>

            <div>
              <label className={labelCls}>Personality override</label>
              <textarea
                rows={3}
                value={form.personalityOverride}
                onChange={e => setForm(f => ({ ...f, personalityOverride: e.target.value }))}
                placeholder="(inherit global personality)"
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Response chance (0-100)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={form.responseChance}
                  onChange={e => setForm(f => ({ ...f, responseChance: e.target.value }))}
                  placeholder="inherit"
                  className={inputCls}
                />
                <p className={helpCls}>% chance to reply to a non-mention message</p>
              </div>

              <div>
                <label className={labelCls}>Cooldown (ms)</label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={form.cooldownMs}
                  onChange={e => setForm(f => ({ ...f, cooldownMs: e.target.value }))}
                  placeholder="inherit"
                  className={inputCls}
                />
                <p className={helpCls}>Per-user reply cooldown</p>
              </div>

              <div>
                <label className={labelCls}>Reply-only mode</label>
                <select
                  value={form.replyOnlyMode}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      replyOnlyMode: e.target.value as 'inherit' | 'true' | 'false',
                    }))
                  }
                  className={inputCls}
                >
                  <option value="inherit">Inherit</option>
                  <option value="true">On (mentions/replies only)</option>
                  <option value="false">Off (free chat)</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls}>Allowed channels (CSV of channel IDs)</label>
              <textarea
                rows={2}
                value={form.allowedChannels}
                onChange={e => setForm(f => ({ ...f, allowedChannels: e.target.value }))}
                placeholder="123456789012345678, 234567890123456789"
                className={`${inputCls} font-mono`}
              />
              <p className={helpCls}>Empty = bot may reply in all channels</p>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-700">
            <h5 className="text-sm font-semibold text-white">Inter-bot conversation</h5>

            <label className="flex items-center justify-between gap-3 p-3 bg-discord-dark rounded-lg border border-gray-700">
              <div>
                <div className="text-sm text-white font-medium">Enable bot-to-bot replies</div>
                <div className="text-xs text-gray-400">
                  Allow this bot to reply to other bots based on the pair-chance matrix.
                </div>
              </div>
              <input
                type="checkbox"
                checked={form.botToBotEnabled}
                onChange={e => setForm(f => ({ ...f, botToBotEnabled: e.target.checked }))}
                className="h-4 w-4 accent-discord-blurple"
              />
            </label>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Max chain depth</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={form.maxChainDepth}
                  onChange={e => setForm(f => ({ ...f, maxChainDepth: Number(e.target.value) }))}
                  className={inputCls}
                />
                <p className={helpCls}>Hops in a bot-to-bot chain</p>
              </div>

              <div>
                <label className={labelCls}>Channel cooldown (ms)</label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={form.channelCooldownMs}
                  onChange={e => setForm(f => ({ ...f, channelCooldownMs: Number(e.target.value) }))}
                  className={inputCls}
                />
                <p className={helpCls}>Min gap between bot-to-bot replies</p>
              </div>

              <div>
                <label className={labelCls}>Breaker count</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={form.circuitBreakerCount}
                  onChange={e => setForm(f => ({ ...f, circuitBreakerCount: Number(e.target.value) }))}
                  className={inputCls}
                />
                <p className={helpCls}>Bot-msgs to trip breaker</p>
              </div>

              <div>
                <label className={labelCls}>Breaker window (ms)</label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={form.circuitBreakerWindowMs}
                  onChange={e =>
                    setForm(f => ({ ...f, circuitBreakerWindowMs: Number(e.target.value) }))
                  }
                  className={inputCls}
                />
                <p className={helpCls}>Sliding window length</p>
              </div>

              <div>
                <label className={labelCls}>Breaker pause (ms)</label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={form.circuitBreakerPauseMs}
                  onChange={e =>
                    setForm(f => ({ ...f, circuitBreakerPauseMs: Number(e.target.value) }))
                  }
                  className={inputCls}
                />
                <p className={helpCls}>Pause length once tripped</p>
              </div>

              <label className="flex items-start gap-2 p-3 bg-discord-dark rounded-lg border border-gray-700 col-span-2 md:col-span-1">
                <input
                  type="checkbox"
                  checked={form.mentionBypassMatrix}
                  onChange={e => setForm(f => ({ ...f, mentionBypassMatrix: e.target.checked }))}
                  className="h-4 w-4 accent-discord-blurple mt-0.5"
                />
                <span className="text-xs text-gray-300">
                  <span className="block text-white font-medium mb-0.5">Mentions bypass matrix</span>
                  Direct @mentions always trigger a reply (100%).
                </span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-700">
            <button
              type="button"
              onClick={handleRevert}
              disabled={!dirty || savingOverrides}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-gray-600 text-gray-300 hover:bg-discord-gray transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Revert
            </button>
            <button
              type="button"
              data-testid={`bot-save-button-${bot.id}`}
              onClick={handleSaveOverrides}
              disabled={!dirty || savingOverrides}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-discord-blurple hover:bg-discord-blurple-dark text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Save className="h-3.5 w-3.5" />
              {savingOverrides ? 'Saving…' : 'Save settings'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GuildBotsConfigForm({ guildId }: GuildBotsConfigFormProps) {
  const { items, loading, error, updateBot } = useGuildBots(guildId);

  const botsLite: BotLite[] = useMemo(
    () =>
      items
        .filter(e => e.presentInGuild)
        .map(e => ({
          id: e.bot.id,
          name: e.bot.name,
          enabled: !!e.settings?.enabled,
          presentInGuild: e.presentInGuild,
        })),
    [items]
  );

  return (
    <div data-testid="guild-bots-tab" className="space-y-6">
      <div className="bg-discord-dark rounded-lg p-4 border border-gray-700">
        <h3 className="text-white font-semibold mb-1">Bots in this server</h3>
        <p className="text-sm text-gray-400">
          Choose which registered bots are active in this server and tune per-guild overrides. Bots
          must first be invited to the server before they can be enabled here.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="bg-red-900/30 border border-red-700/50 rounded-lg px-4 py-3 text-sm text-red-200"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-discord-dark rounded-lg p-6 border border-gray-700 text-gray-400">
          Loading bots…
        </div>
      ) : items.length === 0 ? (
        <div className="bg-discord-dark rounded-lg p-6 border border-gray-700 text-gray-400">
          No bots registered yet. An administrator can add bots from the global Admin → Bots page.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(entry => (
            <BotCard
              key={entry.bot.id}
              entry={entry}
              guildId={guildId}
              onUpdate={updateBot}
            />
          ))}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h3 className="text-white font-semibold">Pair-chance matrix</h3>
          <span className="text-xs text-gray-500">
            {botsLite.length} bot{botsLite.length === 1 ? '' : 's'} in server
          </span>
        </div>
        <PairChanceMatrix guildId={guildId} bots={botsLite} />
      </div>
    </div>
  );
}
