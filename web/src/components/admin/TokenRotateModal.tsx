import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import type { Bot } from '../../types';

interface TokenRotateModalProps {
  open: boolean;
  bot: Bot | null;
  onClose: () => void;
  onRotate: (id: string, newToken: string) => Promise<unknown>;
}

export default function TokenRotateModal({ open, bot, onClose, onRotate }: TokenRotateModalProps) {
  const [token, setToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!bot) return null;

  const handleClose = () => {
    if (submitting) return;
    setToken('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const trimmed = token.trim();
    if (trimmed.length < 50) {
      setError('Token is too short to be valid');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onRotate(bot.id, trimmed);
      toast.success('Token rotated');
      setToken('');
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setError(e?.response?.data?.error || e?.message || 'Failed to rotate token');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title={`Rotate Token — ${bot.name}`} testId="rotate-token-modal">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-400">
          Paste the new Discord bot token. It will be encrypted and the bot will be reconnected.
          The token is never displayed again after save.
        </p>
        {error && (
          <div
            role="alert"
            className="px-3 py-2 rounded bg-red-900/40 border border-red-700 text-red-200 text-sm"
          >
            {error}
          </div>
        )}
        <label className="block">
          <span className="block text-sm font-medium text-gray-300 mb-1">New Token</span>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            data-testid="rotate-token-input"
            autoComplete="new-password"
            spellCheck={false}
            className="w-full px-3 py-2 bg-discord-dark border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-discord-blurple"
            required
          />
        </label>
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-700">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="px-4 py-2 rounded-lg border border-gray-600 text-gray-200 hover:bg-gray-700 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            data-testid="rotate-token-submit"
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-discord-blurple hover:bg-blue-600 text-white font-medium transition disabled:opacity-50"
          >
            {submitting ? 'Rotating…' : 'Rotate Token'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
