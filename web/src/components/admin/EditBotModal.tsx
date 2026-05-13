import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import TokenRotateModal from './TokenRotateModal';
import ApiKeyRotateModal from './ApiKeyRotateModal';
import type { Bot, UpdateBotInput } from '../../types';

interface EditBotModalProps {
  open: boolean;
  bot: Bot | null;
  onClose: () => void;
  onUpdate: (id: string, patch: UpdateBotInput) => Promise<unknown>;
  onRotateToken: (id: string, newToken: string) => Promise<unknown>;
  onRotateApiKey: (id: string, newApiKey: string) => Promise<unknown>;
}

export default function EditBotModal({
  open,
  bot,
  onClose,
  onUpdate,
  onRotateToken,
  onRotateApiKey,
}: EditBotModalProps) {
  if (!bot) return null;
  return (
    <EditBotModalInner
      key={bot.id}
      open={open}
      bot={bot}
      onClose={onClose}
      onUpdate={onUpdate}
      onRotateToken={onRotateToken}
      onRotateApiKey={onRotateApiKey}
    />
  );
}

interface InnerProps {
  open: boolean;
  bot: Bot;
  onClose: () => void;
  onUpdate: (id: string, patch: UpdateBotInput) => Promise<unknown>;
  onRotateToken: (id: string, newToken: string) => Promise<unknown>;
  onRotateApiKey: (id: string, newApiKey: string) => Promise<unknown>;
}

function EditBotModalInner({
  open,
  bot,
  onClose,
  onUpdate,
  onRotateToken,
  onRotateApiKey,
}: InnerProps) {
  const [name, setName] = useState(bot.name);
  const [aiBaseUrl, setAiBaseUrl] = useState(bot.aiBaseUrl ?? '');
  const [aiModel, setAiModel] = useState(bot.aiModel ?? '');
  const [aiPersonality, setAiPersonality] = useState(bot.aiPersonality ?? '');
  const [aiMaxTokens, setAiMaxTokens] = useState(bot.aiMaxTokens ?? 1000);
  const [aiContextMessages, setAiContextMessages] = useState(bot.aiContextMessages ?? 10);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tokenOpen, setTokenOpen] = useState(false);
  const [apiKeyOpen, setApiKeyOpen] = useState(false);

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onUpdate(bot.id, {
        name: name.trim(),
        aiBaseUrl: aiBaseUrl.trim(),
        aiModel: aiModel.trim(),
        aiPersonality,
        aiMaxTokens,
        aiContextMessages,
      });
      toast.success('Bot updated');
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setError(e?.response?.data?.error || e?.message || 'Failed to update bot');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        open={open && !tokenOpen && !apiKeyOpen}
        onClose={handleClose}
        title={`Edit Bot — ${bot.name}`}
        testId="edit-bot-modal"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              role="alert"
              className="px-3 py-2 rounded bg-red-900/40 border border-red-700 text-red-200 text-sm"
            >
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-sm font-medium text-gray-300 mb-1">Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="edit-bot-name"
                autoComplete="off"
                className={inputClass()}
                required
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-gray-300 mb-1">Discord App ID</span>
              <input
                type="text"
                value={bot.discordAppId}
                readOnly
                disabled
                className={`${inputClass()} opacity-60 cursor-not-allowed`}
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-gray-300 mb-1">AI Base URL</span>
              <input
                type="text"
                value={aiBaseUrl}
                onChange={(e) => setAiBaseUrl(e.target.value)}
                autoComplete="off"
                className={inputClass()}
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-gray-300 mb-1">AI Model</span>
              <input
                type="text"
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                autoComplete="off"
                className={inputClass()}
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-gray-300 mb-1">Max Tokens</span>
              <input
                type="number"
                min={1}
                max={32000}
                value={aiMaxTokens}
                onChange={(e) => setAiMaxTokens(Number(e.target.value))}
                className={inputClass()}
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-gray-300 mb-1">Context Messages</span>
              <input
                type="number"
                min={0}
                max={100}
                value={aiContextMessages}
                onChange={(e) => setAiContextMessages(Number(e.target.value))}
                className={inputClass()}
              />
            </label>
          </div>

          <label className="block">
            <span className="block text-sm font-medium text-gray-300 mb-1">Personality</span>
            <textarea
              rows={4}
              value={aiPersonality}
              onChange={(e) => setAiPersonality(e.target.value)}
              className={`${inputClass()} resize-y`}
            />
          </label>

          <div className="border-t border-gray-700 pt-4 space-y-2">
            <p className="text-xs text-gray-400">
              Secrets are write-only. Rotate them with dedicated actions below.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTokenOpen(true)}
                data-testid="open-rotate-token"
                className="px-3 py-1.5 rounded-lg bg-discord-dark border border-gray-600 text-sm text-gray-200 hover:bg-gray-700 transition"
              >
                Rotate Token…
              </button>
              <button
                type="button"
                onClick={() => setApiKeyOpen(true)}
                data-testid="open-rotate-api-key"
                className="px-3 py-1.5 rounded-lg bg-discord-dark border border-gray-600 text-sm text-gray-200 hover:bg-gray-700 transition"
              >
                Rotate API Key…
              </button>
            </div>
          </div>

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
              data-testid="edit-bot-submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-discord-blurple hover:bg-blue-600 text-white font-medium transition disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      <TokenRotateModal
        open={tokenOpen}
        bot={bot}
        onClose={() => setTokenOpen(false)}
        onRotate={onRotateToken}
      />

      <ApiKeyRotateModal
        open={apiKeyOpen}
        bot={bot}
        onClose={() => setApiKeyOpen(false)}
        onRotate={onRotateApiKey}
      />
    </>
  );
}

function inputClass() {
  return 'w-full px-3 py-2 bg-discord-dark border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-discord-blurple';
}
