import { useState } from 'react';
import { Loader2, Plus, RefreshCw, Pencil, RotateCw, Key, Trash2, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { useBots } from '../hooks/useBots';
import { useGlobalAdmin } from '../hooks/useGlobalAdmin';
import AddBotModal from '../components/admin/AddBotModal';
import EditBotModal from '../components/admin/EditBotModal';
import DeleteBotConfirmDialog from '../components/admin/DeleteBotConfirmDialog';
import TokenRotateModal from '../components/admin/TokenRotateModal';
import ApiKeyRotateModal from '../components/admin/ApiKeyRotateModal';
import type { Bot, BotStatus } from '../types';

const STATUS_STYLES: Record<BotStatus, { label: string; className: string }> = {
  ENABLED: { label: 'Enabled', className: 'bg-green-900/40 text-green-300 border border-green-700' },
  DISABLED: { label: 'Disabled', className: 'bg-gray-700/40 text-gray-300 border border-gray-600' },
  TOKEN_INVALID: { label: 'Token Invalid', className: 'bg-red-900/40 text-red-300 border border-red-700' },
  UNHEALTHY: { label: 'Unhealthy', className: 'bg-orange-900/40 text-orange-300 border border-orange-700' },
};

function StatusPill({ status }: { status: BotStatus }) {
  const style =
    STATUS_STYLES[status] ?? {
      label: status,
      className: 'bg-gray-700/40 text-gray-300 border border-gray-600',
    };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${style.className}`}
      data-testid={`bot-status-${status}`}
    >
      {style.label}
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

  if (adminLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-7 w-7 text-discord-blurple animate-spin" />
      </div>
    );
  }

  if (!isGlobalAdmin) {
    return (
      <div className="max-w-lg mx-auto text-center py-16" data-testid="admin-bots-not-authorized">
        <ShieldAlert className="h-14 w-14 text-orange-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Not authorized</h1>
        <p className="text-gray-400">
          This page is restricted to global admins. If you believe this is an error, contact the
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Bot Registry</h1>
          <p className="text-sm text-gray-400">
            Manage all Discord bots in the system. Global admin only — these settings apply across
            every guild that enables the bot.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-discord-dark border border-gray-700 text-sm text-gray-200 hover:bg-gray-700 transition disabled:opacity-50"
            aria-label="Refresh bots"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            data-testid="add-bot-button"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-discord-blurple hover:bg-blue-600 text-white text-sm font-medium transition"
          >
            <Plus className="h-4 w-4" />
            Add Bot
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="px-4 py-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm"
        >
          {error}
        </div>
      )}

      <div
        data-testid="admin-bots-table"
        className="bg-discord-gray border border-gray-700 rounded-lg overflow-hidden"
      >
        {loading && bots.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 text-discord-blurple animate-spin" />
          </div>
        ) : bots.length === 0 ? (
          <div className="text-center py-16 px-4" data-testid="admin-bots-empty">
            <p className="text-gray-300 mb-1 font-medium">No bots yet</p>
            <p className="text-sm text-gray-500">Click "Add Bot" to register the first one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-discord-dark border-b border-gray-700 text-gray-300 uppercase tracking-wide text-xs">
                <tr>
                  <th scope="col" className="px-4 py-3">Name</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3 hidden md:table-cell">Bot User ID</th>
                  <th scope="col" className="px-4 py-3 hidden lg:table-cell">App ID</th>
                  <th scope="col" className="px-4 py-3 hidden lg:table-cell">Migrated</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {bots.map((bot) => (
                  <tr
                    key={bot.id}
                    data-testid={`bot-row-${bot.id}`}
                    className="hover:bg-discord-dark/50 transition"
                  >
                    <td className="px-4 py-3 text-white font-medium">{bot.name}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={bot.status} />
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell font-mono text-xs text-gray-400">
                      {bot.discordBotUserId ?? '—'}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell font-mono text-xs text-gray-400">
                      {bot.discordAppId}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-400">
                      {bot.isMigrated ? 'Yes' : 'No'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end flex-wrap gap-1.5">
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

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
  testId?: string;
}

function ActionButton({ icon, label, onClick, disabled, variant = 'default', testId }: ActionButtonProps) {
  const base =
    'inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border transition disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    default:
      'bg-discord-dark border-gray-600 text-gray-200 hover:bg-gray-700 hover:border-gray-500',
    danger:
      'bg-red-900/30 border-red-800 text-red-300 hover:bg-red-900/60 hover:text-red-200',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={`${base} ${variants[variant]}`}
    >
      {icon}
      {label}
    </button>
  );
}
