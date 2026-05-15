import { useMemo, useState } from 'react';
import {
  AlertCircle,
  Loader2,
  MessageSquare,
  Plus,
  Smile,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../admin/Modal';
import { useReactionRoles } from '../../hooks/useReactionRoles';
import type { ReactionRoleMessage } from '../../types';

interface ReactionRolesConfigFormProps {
  guildId: string;
}

const inputCls =
  'w-full bg-discord-dark border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-discord-blurple text-sm';
const labelCls = 'block text-sm font-medium text-gray-300 mb-1';
const helpCls = 'text-xs text-gray-500 mt-1';

const SNOWFLAKE = /^\d{15,20}$/;

function apiError(e: unknown, fallback: string): string {
  const err = e as { response?: { data?: { error?: string } }; message?: string };
  return err?.response?.data?.error || err?.message || fallback;
}

export default function ReactionRolesConfigForm({ guildId }: ReactionRolesConfigFormProps) {
  const {
    bots,
    selectedBotId,
    setSelectedBotId,
    messages,
    loading,
    error,
    createMessage,
    deleteMessage,
    addBinding,
    removeBinding,
  } = useReactionRoles(guildId);

  const [createOpen, setCreateOpen] = useState(false);

  if (loading && bots.length === 0) {
    return (
      <div className="flex items-center gap-3 py-10 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin text-discord-blurple" />
        <span className="text-sm">Loading reaction roles…</span>
      </div>
    );
  }

  if (error && bots.length === 0) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-red-700/50 bg-red-900/20 p-4 text-sm text-red-200">
        <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Could not load reaction roles</p>
          <p className="mt-1 text-red-300/80">{error}</p>
        </div>
      </div>
    );
  }

  if (bots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-gray-700 bg-discord-dark/50 p-10 text-center">
        <Smile className="h-8 w-8 text-gray-500" />
        <p className="text-sm font-medium text-gray-300">No enabled bots in this guild.</p>
        <p className="text-xs text-gray-500 max-w-sm">
          Enable a bot in the Bots tab before creating reaction-role messages. Only enabled
          bots that are present in this server can post and manage them.
        </p>
      </div>
    );
  }

  const selectedBot = bots.find(b => b.id === selectedBotId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 flex-1">
          <label className={labelCls} htmlFor="rr-bot-picker">
            Bot
          </label>
          <select
            id="rr-bot-picker"
            data-testid="reaction-roles-bot-picker"
            value={selectedBotId ?? ''}
            onChange={e => setSelectedBotId(e.target.value || null)}
            className={inputCls}
          >
            {bots.map(b => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <p className={helpCls}>
            Reaction-role messages are owned by the selected bot. Switching bots shows that
            bot's messages.
          </p>
        </div>

        <button
          type="button"
          data-testid="reaction-roles-create-btn"
          onClick={() => setCreateOpen(true)}
          disabled={!selectedBotId}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-discord-blurple px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Create message
        </button>
      </div>

      {error && bots.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-red-700/50 bg-red-900/20 p-3 text-sm text-red-200">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {loading && messages.length === 0 ? (
        <div className="flex items-center gap-3 py-8 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin text-discord-blurple" />
          <span className="text-sm">Loading messages…</span>
        </div>
      ) : messages.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {messages.map(m => (
            <MessageCard
              key={m.id}
              message={m}
              onDelete={async () => {
                if (!confirm(`Delete reaction-role message "${m.title || m.messageId}"?`)) return;
                try {
                  await deleteMessage(m.id);
                  toast.success('Reaction-role message deleted');
                } catch (e) {
                  toast.error(apiError(e, 'Failed to delete message'));
                }
              }}
              onAddBinding={async (emoji, roleId) => {
                if (!selectedBotId) return;
                await addBinding(m.id, { botId: selectedBotId, emoji, roleId });
              }}
              onRemoveBinding={async emoji => {
                try {
                  await removeBinding(m.id, emoji);
                  toast.success('Binding removed');
                } catch (e) {
                  toast.error(apiError(e, 'Failed to remove binding'));
                }
              }}
            />
          ))}
        </div>
      )}

      <CreateMessageModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        botName={selectedBot?.name ?? ''}
        onCreate={async ({ channelId, title, description }) => {
          if (!selectedBotId) return;
          await createMessage({
            botId: selectedBotId,
            channelId,
            title,
            description,
          });
          toast.success('Reaction-role message posted');
        }}
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-gray-700 bg-discord-dark/50 p-10 text-center">
      <MessageSquare className="h-8 w-8 text-gray-500" />
      <p className="text-sm font-medium text-gray-300">No reaction-role messages yet</p>
      <p className="text-xs text-gray-500 max-w-sm">
        Create a message to let members self-assign roles by reacting with emoji.
      </p>
    </div>
  );
}

interface MessageCardProps {
  message: ReactionRoleMessage;
  onDelete: () => Promise<void> | void;
  onAddBinding: (emoji: string, roleId: string) => Promise<void>;
  onRemoveBinding: (emoji: string) => Promise<void> | void;
}

function MessageCard({ message, onDelete, onAddBinding, onRemoveBinding }: MessageCardProps) {
  const [emoji, setEmoji] = useState('');
  const [roleId, setRoleId] = useState('');
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removingEmoji, setRemovingEmoji] = useState<string | null>(null);

  const description = useMemo(() => {
    const text = message.description || '';
    if (text.length <= 220) return text;
    return text.slice(0, 220) + '…';
  }, [message.description]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmoji = emoji.trim();
    const trimmedRoleId = roleId.trim();
    if (!trimmedEmoji) {
      toast.error('Emoji is required');
      return;
    }
    if (!SNOWFLAKE.test(trimmedRoleId)) {
      toast.error('Role ID must be a Discord snowflake (15–20 digits)');
      return;
    }
    setAdding(true);
    try {
      await onAddBinding(trimmedEmoji, trimmedRoleId);
      setEmoji('');
      setRoleId('');
      toast.success('Binding added');
    } catch (e) {
      toast.error(apiError(e, 'Failed to add binding'));
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  };

  const handleRemove = async (e: string) => {
    setRemovingEmoji(e);
    try {
      await onRemoveBinding(e);
    } finally {
      setRemovingEmoji(null);
    }
  };

  return (
    <div
      data-testid={`reaction-role-card-${message.id}`}
      className="rounded-lg border border-gray-700 bg-discord-dark overflow-hidden"
    >
      <div className="flex items-start justify-between gap-3 border-b border-gray-700/70 bg-discord-gray/40 px-4 py-3">
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-semibold text-white">
            {message.title || '(untitled)'}
          </h4>
          {description && (
            <p className="mt-1 line-clamp-2 text-xs text-gray-400">{description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500">
            <span>
              Channel: <span className="font-mono text-gray-400">{message.channelId}</span>
            </span>
            <span>
              Message: <span className="font-mono text-gray-400">{message.messageId}</span>
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="inline-flex items-center gap-1.5 rounded-md border border-red-700/60 bg-red-900/20 px-2.5 py-1.5 text-xs font-medium text-red-200 transition hover:bg-red-900/40 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Delete reaction-role message"
        >
          {deleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
          Delete
        </button>
      </div>

      <div className="px-4 py-3">
        {message.bindings.length === 0 ? (
          <p className="text-xs text-gray-500 italic">No bindings yet.</p>
        ) : (
          <div className="overflow-hidden rounded-md border border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-discord-gray/40 text-left text-[11px] uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-3 py-2 font-medium">Emoji</th>
                  <th className="px-3 py-2 font-medium">Role ID</th>
                  <th className="px-3 py-2 w-px font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/70">
                {message.bindings.map(b => (
                  <tr key={b.id} className="text-gray-200">
                    <td className="px-3 py-2 font-mono text-gray-100">{b.emoji}</td>
                    <td className="px-3 py-2 font-mono text-gray-300">{b.roleId}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemove(b.emoji)}
                        disabled={removingEmoji === b.emoji}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-300 transition hover:bg-red-900/30 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`Remove binding for ${b.emoji}`}
                      >
                        {removingEmoji === b.emoji ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <form
          onSubmit={handleAdd}
          className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]"
        >
          <div>
            <label className={labelCls} htmlFor={`emoji-${message.id}`}>
              Emoji
            </label>
            <input
              id={`emoji-${message.id}`}
              type="text"
              value={emoji}
              onChange={e => setEmoji(e.target.value)}
              placeholder="👍"
              className={inputCls}
              autoComplete="off"
            />
          </div>
          <div>
            <label className={labelCls} htmlFor={`role-${message.id}`}>
              Role ID
            </label>
            <input
              id={`role-${message.id}`}
              type="text"
              inputMode="numeric"
              value={roleId}
              onChange={e => setRoleId(e.target.value)}
              placeholder="17–20 digit snowflake"
              className={`${inputCls} font-mono`}
              autoComplete="off"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={adding}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-discord-blurple px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add
            </button>
          </div>
        </form>
        <p className={`${helpCls} mt-2`}>
          Tip: For custom emoji use <span className="font-mono text-gray-400">{'<:name:id>'}</span> form.
        </p>
      </div>
    </div>
  );
}

interface CreateMessageModalProps {
  open: boolean;
  onClose: () => void;
  botName: string;
  onCreate: (input: { channelId: string; title: string; description: string }) => Promise<void>;
}

function CreateMessageModal({ open, onClose, botName, onCreate }: CreateMessageModalProps) {
  const [channelId, setChannelId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setChannelId('');
    setTitle('');
    setDescription('');
    setSubmitting(false);
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const trimmedChannel = channelId.trim();
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!SNOWFLAKE.test(trimmedChannel)) {
      toast.error('Channel ID must be a Discord snowflake (15–20 digits)');
      return;
    }
    if (!trimmedTitle) {
      toast.error('Title is required');
      return;
    }
    if (!trimmedDescription) {
      toast.error('Description is required');
      return;
    }

    setSubmitting(true);
    try {
      await onCreate({
        channelId: trimmedChannel,
        title: trimmedTitle,
        description: trimmedDescription,
      });
      reset();
      onClose();
    } catch (err) {
      toast.error(apiError(err, 'Failed to create message'));
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create reaction-role message"
      description={botName ? `Posted as ${botName}.` : undefined}
      testId="reaction-roles-create-modal"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls} htmlFor="rr-channel-id">
            Channel ID
          </label>
          <input
            id="rr-channel-id"
            type="text"
            inputMode="numeric"
            value={channelId}
            onChange={e => setChannelId(e.target.value)}
            placeholder="17–20 digit snowflake"
            className={`${inputCls} font-mono`}
            autoComplete="off"
            required
          />
          <p className={helpCls}>The bot must have permission to post in this channel.</p>
        </div>

        <div>
          <label className={labelCls} htmlFor="rr-title">
            Title
          </label>
          <input
            id="rr-title"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Pick your roles"
            className={inputCls}
            autoComplete="off"
            required
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="rr-description">
            Description
          </label>
          <textarea
            id="rr-description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={5}
            placeholder="React with the emoji below to get the matching role."
            className={`${inputCls} resize-y`}
            required
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-700 pt-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-200 transition hover:bg-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-discord-blurple px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? 'Posting…' : 'Post message'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
