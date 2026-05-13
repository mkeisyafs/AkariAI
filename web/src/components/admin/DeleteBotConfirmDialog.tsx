import { useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import type { Bot } from '../../types';

interface DeleteBotConfirmDialogProps {
  open: boolean;
  bot: Bot | null;
  onClose: () => void;
  onDelete: (id: string) => Promise<unknown>;
}

export default function DeleteBotConfirmDialog({
  open,
  bot,
  onClose,
  onDelete,
}: DeleteBotConfirmDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!bot) return null;

  const matches = confirmText === bot.name;

  const handleClose = () => {
    if (submitting) return;
    setConfirmText('');
    onClose();
  };

  const handleConfirm = async () => {
    if (submitting || !matches) return;
    setSubmitting(true);
    setError(null);
    try {
      await onDelete(bot.id);
      toast.success(`Bot "${bot.name}" deleted`);
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setError(e?.response?.data?.error || e?.message || 'Failed to delete bot');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Delete Bot"
      testId="delete-confirm-dialog"
      size="sm"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-red-900/30 border border-red-800">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-200">
            <p className="font-medium mb-1">This action cannot be undone.</p>
            <p className="text-red-300/80">
              The bot will be disconnected and removed from all guilds. Moderation history and
              knowledge entries will be preserved but un-linked.
            </p>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="px-3 py-2 rounded bg-red-900/40 border border-red-700 text-red-200 text-sm"
          >
            {error}
          </div>
        )}

        <label className="block">
          <span className="block text-sm text-gray-300 mb-1">
            Type <span className="font-mono text-white">{bot.name}</span> to confirm:
          </span>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            data-testid="delete-confirm-input"
            autoComplete="off"
            autoFocus
            className="w-full px-3 py-2 bg-discord-dark border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-red-500"
          />
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="px-4 py-2 rounded-lg border border-gray-600 text-gray-200 hover:bg-gray-700 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            data-testid="delete-confirm-button"
            disabled={!matches || submitting}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Deleting…' : 'Delete Bot'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
