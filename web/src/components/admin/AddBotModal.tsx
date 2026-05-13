import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import type { CreateBotInput } from '../../types';

interface AddBotModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (input: CreateBotInput) => Promise<unknown>;
}

const SNOWFLAKE = /^\d{17,20}$/;

export default function AddBotModal({ open, onClose, onCreate }: AddBotModalProps) {
  const [name, setName] = useState('');
  const [discordAppId, setDiscordAppId] = useState('');
  const [token, setToken] = useState('');
  const [aiBaseUrl, setAiBaseUrl] = useState('');
  const [aiModel, setAiModel] = useState('');
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiPersonality, setAiPersonality] = useState('');
  const [aiMaxTokens, setAiMaxTokens] = useState(1000);
  const [aiContextMessages, setAiContextMessages] = useState(10);

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const reset = () => {
    setName('');
    setDiscordAppId('');
    setToken('');
    setAiBaseUrl('');
    setAiModel('');
    setAiApiKey('');
    setAiPersonality('');
    setAiMaxTokens(1000);
    setAiContextMessages(10);
    setErrors({});
    setSubmitting(false);
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Name is required';
    if (!SNOWFLAKE.test(discordAppId.trim()))
      next.discordAppId = 'Must be a Discord snowflake (17–20 digits)';
    if (token.trim().length < 50) next.token = 'Token is too short to be valid';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!validate()) return;
    setSubmitting(true);
    setErrors((prev) => ({ ...prev, _form: '' }));

    const payload: CreateBotInput = {
      name: name.trim(),
      discordAppId: discordAppId.trim(),
      token: token.trim(),
    };
    if (aiBaseUrl.trim()) payload.aiBaseUrl = aiBaseUrl.trim();
    if (aiModel.trim()) payload.aiModel = aiModel.trim();
    if (aiApiKey.trim()) payload.aiApiKey = aiApiKey.trim();
    if (aiPersonality.trim()) payload.aiPersonality = aiPersonality.trim();
    if (Number.isFinite(aiMaxTokens)) payload.aiMaxTokens = aiMaxTokens;
    if (Number.isFinite(aiContextMessages)) payload.aiContextMessages = aiContextMessages;

    try {
      await onCreate(payload);
      toast.success(`Bot "${payload.name}" created`);
      reset();
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { error?: string } }; message?: string };
      const msg = e?.response?.data?.error || e?.message || 'Failed to create bot';
      const status = e?.response?.status;
      if (status === 400 && /token/i.test(msg)) {
        setErrors({ token: msg });
      } else {
        setErrors({ _form: msg });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Add Bot" testId="add-bot-modal" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors._form && (
          <div
            role="alert"
            className="px-3 py-2 rounded bg-red-900/40 border border-red-700 text-red-200 text-sm"
          >
            {errors._form}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Name" error={errors.name}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="add-bot-name"
              autoComplete="off"
              className={inputClass(!!errors.name)}
              placeholder="e.g. Akari"
              required
            />
          </Field>

          <Field label="Discord Application ID" error={errors.discordAppId}>
            <input
              type="text"
              value={discordAppId}
              onChange={(e) => setDiscordAppId(e.target.value)}
              data-testid="add-bot-app-id"
              autoComplete="off"
              inputMode="numeric"
              className={inputClass(!!errors.discordAppId)}
              placeholder="17–20 digit snowflake"
              required
            />
          </Field>
        </div>

        <Field label="Discord Bot Token" error={errors.token} hint="Stored encrypted. Never displayed after save.">
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            data-testid="add-bot-token"
            autoComplete="new-password"
            spellCheck={false}
            className={inputClass(!!errors.token)}
            required
          />
        </Field>

        <div className="border-t border-gray-700 pt-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">
            AI Configuration (optional defaults)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="AI Base URL">
              <input
                type="text"
                value={aiBaseUrl}
                onChange={(e) => setAiBaseUrl(e.target.value)}
                autoComplete="off"
                className={inputClass(false)}
                placeholder="https://api.openai.com/v1"
              />
            </Field>
            <Field label="AI Model">
              <input
                type="text"
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                autoComplete="off"
                className={inputClass(false)}
                placeholder="gpt-4o-mini"
              />
            </Field>
            <Field label="AI API Key" hint="Stored encrypted.">
              <input
                type="password"
                value={aiApiKey}
                onChange={(e) => setAiApiKey(e.target.value)}
                autoComplete="new-password"
                spellCheck={false}
                className={inputClass(false)}
              />
            </Field>
            <Field label="Max Tokens">
              <input
                type="number"
                min={1}
                max={32000}
                value={aiMaxTokens}
                onChange={(e) => setAiMaxTokens(Number(e.target.value))}
                className={inputClass(false)}
              />
            </Field>
            <Field label="Context Messages">
              <input
                type="number"
                min={0}
                max={100}
                value={aiContextMessages}
                onChange={(e) => setAiContextMessages(Number(e.target.value))}
                className={inputClass(false)}
              />
            </Field>
          </div>

          <Field label="Personality" className="mt-4">
            <textarea
              rows={3}
              value={aiPersonality}
              onChange={(e) => setAiPersonality(e.target.value)}
              className={`${inputClass(false)} resize-y`}
              placeholder="You are a helpful assistant..."
            />
          </Field>
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
            data-testid="add-bot-submit"
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-discord-blurple hover:bg-blue-600 text-white font-medium transition disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create Bot'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function inputClass(hasError: boolean) {
  return [
    'w-full px-3 py-2 bg-discord-dark border rounded-lg text-white text-sm',
    'focus:outline-none focus:border-discord-blurple',
    hasError ? 'border-red-500' : 'border-gray-700',
  ].join(' ');
}

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}

function Field({ label, error, hint, className, children }: FieldProps) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="block text-sm font-medium text-gray-300 mb-1">{label}</span>
      {children}
      {hint && !error && <span className="block text-xs text-gray-500 mt-1">{hint}</span>}
      {error && (
        <span role="alert" className="block text-xs text-red-400 mt-1">
          {error}
        </span>
      )}
    </label>
  );
}
