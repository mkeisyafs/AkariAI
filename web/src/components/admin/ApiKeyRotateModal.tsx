import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import type { Bot } from '../../types';

interface ApiKeyRotateModalProps {
  open: boolean;
  bot: Bot | null;
  onClose: () => void;
  onRotate: (id: string, newApiKey: string) => Promise<unknown>;
}

export default function ApiKeyRotateModal({ open, bot, onClose, onRotate }: ApiKeyRotateModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!bot) return null;

  const handleClose = () => {
    if (submitting) return;
    setApiKey('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setError('API key cannot be empty');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onRotate(bot.id, trimmed);
      toast.success('API key rotated');
      setApiKey('');
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setError(e?.response?.data?.error || e?.message || 'Failed to rotate API key');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Rotate API Key — ${bot.name}`}
      testId="rotate-api-key-modal"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-400">
          Paste the new AI provider API key. It will be encrypted and never displayed again.
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
          <span className="block text-sm font-medium text-gray-300 mb-1">New API Key</span>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            data-testid="rotate-api-key-input"
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
            data-testid="rotate-api-key-submit"
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-discord-blurple hover:bg-blue-600 text-white font-medium transition disabled:opacity-50"
          >
            {submitting ? 'Rotating…' : 'Rotate API Key'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
