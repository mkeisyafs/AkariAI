import { useMemo, useState } from 'react';
import {
  Loader2,
  Plus,
  RefreshCw,
  Pencil,
  RotateCw,
  Key,
  Trash2,
  ShieldAlert,
  Bot as BotIcon,
  Search,
  MoreVertical,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useBots } from '../hooks/useBots';
import { useGlobalAdmin } from '../hooks/useGlobalAdmin';
import AddBotModal from '../components/admin/AddBotModal';
import EditBotModal from '../components/admin/EditBotModal';
import DeleteBotConfirmDialog from '../components/admin/DeleteBotConfirmDialog';
import TokenRotateModal from '../components/admin/TokenRotateModal';
import ApiKeyRotateModal from '../components/admin/ApiKeyRotateModal';
import type { Bot, BotStatus } from '../types';

const STATUS_STYLES: Record<
  BotStatus,
  { label: string; className: string; dot: string }
> = {
  ENABLED: {
    label: 'Enabled',
    className: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    dot: 'bg-emerald-400',
  },
  DISABLED: {
    label: 'Disabled',
    className: 'bg-surface-3 text-ink-secondary border-line-default',
    dot: 'bg-ink-muted',
  },
  TOKEN_INVALID: {
    label: 'Token Invalid',
    className: 'bg-red-500/10 text-red-300 border-red-500/30',
    dot: 'bg-red-400',
  },
  UNHEALTHY: {
    label: 'Unhealthy',
    className: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    dot: 'bg-amber-400',
  },
};

function StatusPill({ status }: { status: BotStatus }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.DISABLED;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${s.className}`}
      data-testid={`bot-status-${status}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

export default function AdminBots() {
  const { isGlobalAdmin, loading: adminLoading } = useGlobalAdmin();
  const {
    bots,
    loading,
    error,
    refresh,
    createBot,
    updateBot,
    rotateToken,
    rotateApiKey,
    deleteBot,
    restartBot,
  } = useBots();

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Bot | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Bot | null>(null);
  const [tokenTarget, setTokenTarget] = useState<Bot | null>(null);
  const [apiKeyTarget, setApiKeyTarget] = useState<Bot | null>(null);
  const [restartingId, setRestartingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<BotStatus | 'ALL'>('ALL');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bots.filter((b) => {
      if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        b.discordAppId.includes(q) ||
        (b.discordBotUserId ?? '').includes(q)
      );
    });
  }, [bots, query, statusFilter]);

  const counts = useMemo(() => {
    const total = bots.length;
    const enabled = bots.filter((b) => b.status === 'ENABLED').length;
    const issues = bots.filter(
      (b) => b.status === 'TOKEN_INVALID' || b.status === 'UNHEALTHY',
    ).length;
    return { total, enabled, issues };
  }, [bots]);

  if (adminLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-7 w-7 text-brand-400 animate-spin" />
      </div>
    );
  }

  if (!isGlobalAdmin) {
    return (
      <div
        className="surface-card mx-auto max-w-lg text-center py-14 px-6"
        data-testid="admin-bots-not-authorized"
      >
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30">
          <ShieldAlert className="h-7 w-7 text-amber-300" />
        </div>
        <h1 className="mt-5 text-xl font-semibold text-white">Not authorized</h1>
        <p className="mt-2 text-sm text-ink-secondary">
          This page is restricted to global admins. If you think this is a mistake, contact the
          system operator.
        </p>
      </div>
    );
  }

  const handleRestart = async (bot: Bot) => {
    setRestartingId(bot.id);
    try {
      await restartBot(bot.id);
      toast.success(`Restarted ${bot.name}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      toast.error(e?.response?.data?.error || e?.message || 'Restart failed');
    } finally {
      setRestartingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="section-title">Global admin</p>
          <h1 className="mt-1 text-2xl md:text-3xl font-bold text-white tracking-tight">
            Bot Registry
          </h1>
          <p className="mt-1.5 text-sm md:text-base text-ink-secondary max-w-2xl">
            Manage every Discord bot instance. Settings here apply across all guilds that bind
            this bot.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="btn btn-secondary btn-sm"
            aria-label="Refresh bots"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            data-testid="add-bot-button"
            className="btn btn-primary btn-sm"
          >
            <Plus className="h-4 w-4" />
            Add bot
          </button>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <StatTile label="Total" value={counts.total} />
        <StatTile label="Enabled" value={counts.enabled} tone="success" />
        <StatTile label="Issues" value={counts.issues} tone={counts.issues ? 'danger' : 'neutral'} />
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or ID…"
            className="input pl-9"
            aria-label="Search bots"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-0.5 px-0.5">
          {(['ALL', 'ENABLED', 'DISABLED', 'TOKEN_INVALID', 'UNHEALTHY'] as const).map((f) => {
            const active = statusFilter === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setStatusFilter(f)}
                className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? 'border-brand-500/40 bg-brand-600/15 text-white'
                    : 'border-line-default bg-surface-2 text-ink-secondary hover:text-white'
                }`}
              >
                {f === 'ALL' ? 'All' : STATUS_STYLES[f].label}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {error}
        </div>
      )}

      <div data-testid="admin-bots-table">
        {loading && bots.length === 0 ? (
          <div className="flex items-center justify-center py-20 surface-panel">
            <Loader2 className="h-6 w-6 text-brand-400 animate-spin" />
          </div>
        ) : bots.length === 0 ? (
          <EmptyRegistry onAdd={() => setAddOpen(true)} />
        ) : filtered.length === 0 ? (
          <div className="surface-panel text-center py-12">
            <Search className="mx-auto h-8 w-8 text-ink-muted" />
            <p className="mt-3 text-sm text-ink-secondary">No bots match your filters.</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block surface-panel overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-surface-1 border-b border-line-subtle text-ink-muted uppercase tracking-wider text-[10px]">
                    <tr>
                      <th scope="col" className="px-5 py-3 font-medium">Bot</th>
                      <th scope="col" className="px-5 py-3 font-medium">Status</th>
                      <th scope="col" className="px-5 py-3 font-medium hidden lg:table-cell">
                        Bot User ID
                      </th>
                      <th scope="col" className="px-5 py-3 font-medium hidden xl:table-cell">
                        App ID
                      </th>
                      <th scope="col" className="px-5 py-3 font-medium hidden xl:table-cell">
                        Migrated
                      </th>
                      <th scope="col" className="px-5 py-3 font-medium text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-subtle">
                    {filtered.map((bot) => (
                      <tr
                        key={bot.id}
                        data-testid={`bot-row-${bot.id}`}
                        className="transition hover:bg-surface-3/40"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500/20 to-accent-500/20 ring-1 ring-line-default">
                              <BotIcon className="h-4 w-4 text-brand-300" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-white truncate">{bot.name}</p>
                              <p className="text-[11px] text-ink-muted font-mono truncate">
                                {bot.aiModel || 'default model'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusPill status={bot.status} />
                        </td>
                        <td className="px-5 py-3.5 hidden lg:table-cell font-mono text-xs text-ink-muted">
                          {bot.discordBotUserId ?? '—'}
                        </td>
                        <td className="px-5 py-3.5 hidden xl:table-cell font-mono text-xs text-ink-muted">
                          {bot.discordAppId}
                        </td>
                        <td className="px-5 py-3.5 hidden xl:table-cell text-xs text-ink-muted">
                          {bot.isMigrated ? 'Yes' : 'No'}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-wrap justify-end gap-1.5">
                            <ActionButton
                              icon={<Pencil className="h-3.5 w-3.5" />}
                              label="Edit"
                              onClick={() => setEditTarget(bot)}
                              testId={`bot-action-edit-${bot.id}`}
                            />
                            <ActionButton
                              icon={
                                <RotateCw
                                  className={`h-3.5 w-3.5 ${
                                    restartingId === bot.id ? 'animate-spin' : ''
                                  }`}
                                />
                              }
                              label="Restart"
                              onClick={() => handleRestart(bot)}
                              disabled={restartingId === bot.id}
                              testId={`bot-action-restart-${bot.id}`}
                            />
                            <ActionButton
                              icon={<Key className="h-3.5 w-3.5" />}
                              label="Token"
                              onClick={() => setTokenTarget(bot)}
                              testId={`bot-action-token-${bot.id}`}
                            />
                            <ActionButton
                              icon={<Key className="h-3.5 w-3.5" />}
                              label="API Key"
                              onClick={() => setApiKeyTarget(bot)}
                              testId={`bot-action-api-key-${bot.id}`}
                            />
                            <ActionButton
                              icon={<Trash2 className="h-3.5 w-3.5" />}
                              label="Delete"
                              onClick={() => setDeleteTarget(bot)}
                              variant="danger"
                              testId={`bot-action-delete-${bot.id}`}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="md:hidden grid grid-cols-1 gap-3">
              {filtered.map((bot) => (
                <BotCard
                  key={bot.id}
                  bot={bot}
                  restarting={restartingId === bot.id}
                  onEdit={() => setEditTarget(bot)}
                  onRestart={() => handleRestart(bot)}
                  onToken={() => setTokenTarget(bot)}
                  onApiKey={() => setApiKeyTarget(bot)}
                  onDelete={() => setDeleteTarget(bot)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <AddBotModal open={addOpen} onClose={() => setAddOpen(false)} onCreate={createBot} />
      <EditBotModal
        open={editTarget !== null}
        bot={editTarget}
        onClose={() => setEditTarget(null)}
        onUpdate={updateBot}
        onRotateToken={rotateToken}
        onRotateApiKey={rotateApiKey}
      />
      <TokenRotateModal
        open={tokenTarget !== null}
        bot={tokenTarget}
        onClose={() => setTokenTarget(null)}
        onRotate={rotateToken}
      />
      <ApiKeyRotateModal
        open={apiKeyTarget !== null}
        bot={apiKeyTarget}
        onClose={() => setApiKeyTarget(null)}
        onRotate={rotateApiKey}
      />
      <DeleteBotConfirmDialog
        open={deleteTarget !== null}
        bot={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDelete={deleteBot}
      />
    </div>
  );
}

function BotCard({
  bot,
  restarting,
  onEdit,
  onRestart,
  onToken,
  onApiKey,
  onDelete,
}: {
  bot: Bot;
  restarting: boolean;
  onEdit: () => void;
  onRestart: () => void;
  onToken: () => void;
  onApiKey: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="surface-card p-4"
      data-testid={`bot-row-${bot.id}`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500/20 to-accent-500/20 ring-1 ring-line-default">
          <BotIcon className="h-5 w-5 text-brand-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white truncate">{bot.name}</p>
          <p className="mt-0.5 text-[11px] text-ink-muted font-mono truncate">
            {bot.discordBotUserId ?? bot.discordAppId}
          </p>
        </div>
        <StatusPill status={bot.status} />
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        <button
          type="button"
          onClick={onEdit}
          className="btn btn-secondary btn-sm flex-1"
          data-testid={`bot-action-edit-${bot.id}`}
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
        <button
          type="button"
          onClick={onRestart}
          disabled={restarting}
          className="btn btn-secondary btn-sm flex-1"
          data-testid={`bot-action-restart-${bot.id}`}
        >
          <RotateCw className={`h-3.5 w-3.5 ${restarting ? 'animate-spin' : ''}`} />
          Restart
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="btn btn-secondary btn-sm"
          aria-label="More actions"
          aria-expanded={open}
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      </div>

      {open && (
        <div className="mt-2 flex flex-wrap gap-1.5 pt-2 border-t border-line-subtle animate-in-up">
          <button
            type="button"
            onClick={onToken}
            className="btn btn-ghost btn-sm"
            data-testid={`bot-action-token-${bot.id}`}
          >
            <Key className="h-3.5 w-3.5" />
            Rotate token
          </button>
          <button
            type="button"
            onClick={onApiKey}
            className="btn btn-ghost btn-sm"
            data-testid={`bot-action-api-key-${bot.id}`}
          >
            <Key className="h-3.5 w-3.5" />
            Rotate API key
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="btn btn-ghost btn-sm text-red-300 hover:bg-red-500/10 hover:text-red-200"
            data-testid={`bot-action-delete-${bot.id}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: number | string;
  tone?: 'neutral' | 'success' | 'danger';
}) {
  const color =
    tone === 'success'
      ? 'text-emerald-300'
      : tone === 'danger'
        ? 'text-red-300'
        : 'text-white';
  return (
    <div className="surface-panel px-4 py-3 md:px-5 md:py-4">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className={`mt-1 text-xl md:text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function EmptyRegistry({ onAdd }: { onAdd: () => void }) {
  return (
    <div
      className="surface-card text-center py-14 px-6"
      data-testid="admin-bots-empty"
    >
      <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/20 to-accent-500/20 border border-line-default">
        <BotIcon className="h-7 w-7 text-brand-300" />
      </div>
      <h3 className="mt-5 text-lg font-semibold text-white">No bots registered yet</h3>
      <p className="mt-2 text-sm text-ink-secondary max-w-sm mx-auto">
        Register your first Discord bot to bring it under AkariAI's management.
      </p>
      <button type="button" onClick={onAdd} className="btn btn-primary mt-5 mx-auto">
        <Plus className="h-4 w-4" />
        Add your first bot
      </button>
    </div>
  );
}

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
  testId?: string;
}

function ActionButton({
  icon,
  label,
  onClick,
  disabled,
  variant = 'default',
  testId,
}: ActionButtonProps) {
  const styles =
    variant === 'danger'
      ? 'border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-200'
      : 'border-line-default bg-surface-1 text-ink-secondary hover:bg-surface-3 hover:text-white';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${styles}`}
    >
      {icon}
      {label}
    </button>
  );
}
