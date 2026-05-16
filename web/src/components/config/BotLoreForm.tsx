import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Bot as BotIcon,
  Loader2,
  Lightbulb,
  Save,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useBotRelationships } from '../../hooks/useBotRelationships';
import type { BotLoreBot, BotRelationship } from '../../types';

interface BotLoreFormProps {
  guildId: string;
}

const MAX_LEN = 2000;

function apiError(e: unknown, fallback: string): string {
  const err = e as { response?: { data?: { error?: string } }; message?: string };
  return err?.response?.data?.error || err?.message || fallback;
}

function pairKey(fromId: string, toId: string): string {
  return `${fromId}::${toId}`;
}

export default function BotLoreForm({ guildId }: BotLoreFormProps) {
  const { bots, relationships, loading, error, refresh, upsert, remove } =
    useBotRelationships(guildId);

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [clearingKey, setClearingKey] = useState<string | null>(null);

  const relMap = useMemo(() => {
    const m: Record<string, BotRelationship> = {};
    for (const r of relationships) m[pairKey(r.fromBotId, r.toBotId)] = r;
    return m;
  }, [relationships]);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const r of relationships) next[pairKey(r.fromBotId, r.toBotId)] = r.relationship;
    setDrafts(next);
  }, [relationships, bots]);

  if (loading && bots.length === 0) {
    return (
      <div className="flex items-center gap-3 py-10 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin text-discord-blurple" />
        <span className="text-sm">Loading bot relationships…</span>
      </div>
    );
  }

  if (error && bots.length === 0) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-red-700/50 bg-red-900/20 p-4 text-sm text-red-200">
        <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="font-medium">Could not load bot relationships</p>
          <p className="mt-1 text-red-300/80 break-words">{error}</p>
          <button
            type="button"
            onClick={refresh}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-900/40 hover:bg-red-900/60 text-xs font-medium text-red-100 transition"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const enabledBots = bots.filter(b => b.enabledInGuild);
  const hasEnoughBots = enabledBots.length >= 2;

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h3 className="text-white font-semibold text-base">Bot relationships</h3>
        <p className="text-sm text-gray-400">
          Describe how each bot views the others. Each line is injected into the bot's system
          prompt before its conversation history.
        </p>
      </header>

      <div
        role="note"
        className="flex items-start gap-3 rounded-lg border border-blue-700/40 bg-blue-900/20 p-4 text-sm text-blue-100"
      >
        <Lightbulb className="h-5 w-5 flex-shrink-0 mt-0.5 text-blue-300" />
        <p className="leading-relaxed">
          <span className="font-semibold">Tip:</span> relationships are directed. Bot A's view
          of Bot B can differ from B's view of A. Use 2nd-person voice (e.g.{' '}
          <em>&ldquo;You see them as a rival&rdquo;</em>) because the text is appended to the
          bot's own system prompt.
        </p>
      </div>

      {!hasEnoughBots ? (
        <EmptyState bots={bots} />
      ) : (
        <div className="space-y-4">
          {enabledBots.map(fromBot => (
            <SpeakerCard
              key={fromBot.id}
              fromBot={fromBot}
              targets={enabledBots.filter(b => b.id !== fromBot.id)}
              drafts={drafts}
              relMap={relMap}
              savingKey={savingKey}
              clearingKey={clearingKey}
              onChange={(toId, value) =>
                setDrafts(prev => ({ ...prev, [pairKey(fromBot.id, toId)]: value }))
              }
              onSave={async (toBot, value) => {
                const key = pairKey(fromBot.id, toBot.id);
                const trimmed = value.trim();
                setSavingKey(key);
                try {
                  if (trimmed === '') {
                    await remove(fromBot.id, toBot.id);
                    toast.success('Lore cleared', { style: { background: '#374151', color: '#fff' } });
                  } else {
                    await upsert(fromBot.id, toBot.id, trimmed);
                    toast.success('Lore updated');
                  }
                  await refresh();
                } catch (e: unknown) {
                  toast.error(apiError(e, 'Failed to save'));
                } finally {
                  setSavingKey(null);
                }
              }}
              onClear={async toBot => {
                const key = pairKey(fromBot.id, toBot.id);
                if (!relMap[key]) return;
                if (!window.confirm(`Clear ${fromBot.name}'s lore about ${toBot.name}?`)) return;
                setClearingKey(key);
                try {
                  await remove(fromBot.id, toBot.id);
                  toast.success('Lore cleared', { style: { background: '#374151', color: '#fff' } });
                  await refresh();
                } catch (e: unknown) {
                  toast.error(apiError(e, 'Failed to clear'));
                } finally {
                  setClearingKey(null);
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ bots }: { bots: BotLoreBot[] }) {
  const enabledCount = bots.filter(b => b.enabledInGuild).length;
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-gray-700 bg-discord-dark/50 p-10 text-center">
      <BotIcon className="h-8 w-8 text-gray-500" />
      <p className="text-sm font-medium text-gray-300">
        Add at least two enabled bots to this server to define relationships.
      </p>
      <p className="text-xs text-gray-500 max-w-sm">
        {enabledCount === 0
          ? 'No bots are currently enabled in this server.'
          : `Only ${enabledCount} bot is enabled here — you need at least two.`}{' '}
        Head to the <span className="text-blue-300 font-medium">Bots</span> tab to enable
        more.
      </p>
    </div>
  );
}

interface SpeakerCardProps {
  fromBot: BotLoreBot;
  targets: BotLoreBot[];
  drafts: Record<string, string>;
  relMap: Record<string, BotRelationship>;
  savingKey: string | null;
  clearingKey: string | null;
  onChange: (toId: string, value: string) => void;
  onSave: (toBot: BotLoreBot, value: string) => void | Promise<void>;
  onClear: (toBot: BotLoreBot) => void | Promise<void>;
}

function SpeakerCard({
  fromBot,
  targets,
  drafts,
  relMap,
  savingKey,
  clearingKey,
  onChange,
  onSave,
  onClear,
}: SpeakerCardProps) {
  return (
    <div className="bg-discord-dark rounded-lg border border-gray-700 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700 bg-discord-gray/40">
        <div className="h-9 w-9 rounded-full bg-discord-blurple flex items-center justify-center text-white shrink-0">
          <BotIcon className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0">
          <h4 className="text-white font-medium truncate">From {fromBot.name}</h4>
          <p className="text-xs text-gray-500">
            How {fromBot.name} sees the other bots in this server.
          </p>
        </div>
      </div>

      <div className="divide-y divide-gray-700/60">
        {targets.map(toBot => {
          const key = pairKey(fromBot.id, toBot.id);
          const draft = drafts[key] ?? '';
          const existing = relMap[key];
          const currentSaved = existing?.relationship ?? '';
          const trimmed = draft.trim();
          const overLimit = draft.length > MAX_LEN;
          const noDiff = trimmed === currentSaved.trim();
          const isSaving = savingKey === key;
          const isClearing = clearingKey === key;
          const disableSave = noDiff || isSaving || isClearing || overLimit;
          const counterCls = overLimit
            ? 'text-red-300'
            : draft.length > MAX_LEN * 0.9
              ? 'text-yellow-300'
              : 'text-gray-500';

          return (
            <div key={toBot.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="text-gray-500">→</span>
                  <span className="font-medium text-white">{toBot.name}</span>
                </div>
                <span className={`text-xs font-mono ${counterCls}`}>
                  {draft.length}/{MAX_LEN}
                </span>
              </div>

              <textarea
                value={draft}
                onChange={e => onChange(toBot.id, e.target.value)}
                maxLength={MAX_LEN}
                rows={3}
                placeholder="(no relationship defined — bot has no special context for this peer)"
                className="w-full bg-discord-gray border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-discord-blurple text-sm font-mono resize-y min-h-[5.5rem]"
                spellCheck={false}
              />

              <div className="flex items-center justify-end gap-2">
                {existing && (
                  <button
                    type="button"
                    onClick={() => onClear(toBot)}
                    disabled={isSaving || isClearing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-discord-gray hover:bg-gray-600 disabled:opacity-50 text-gray-200 text-xs font-medium transition border border-gray-600"
                  >
                    {isClearing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onSave(toBot, draft)}
                  disabled={disableSave}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-discord-blurple hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium transition"
                >
                  {isSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Save
                </button>
              </div>

              {overLimit && (
                <p className="text-xs text-red-300">
                  Too long. Trim to {MAX_LEN} characters or fewer to save.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
