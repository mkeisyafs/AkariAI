import { useState, useEffect } from 'react';
import { Trash2, Plus, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import type { GuildConfig } from '../../types';

interface AIConfigFormProps {
  config: GuildConfig;
  onSave: (updates: Partial<GuildConfig>) => Promise<GuildConfig | undefined>;
  loading: boolean;
}

export default function AIConfigForm({ config, onSave, loading }: AIConfigFormProps) {
  const [aiEnabled, setAiEnabled] = useState(config.aiEnabled ?? true);
  const [aiReplyOnlyMode, setAiReplyOnlyMode] = useState(config.aiReplyOnlyMode ?? false);
  const [formData, setFormData] = useState({
    aiBaseUrl: config.aiBaseUrl,
    aiModel: config.aiModel,
    aiApiKey: config.aiApiKey,
    aiPersonality: config.aiPersonality,
    aiResponseChance: config.aiResponseChance,
    aiCooldown: config.aiCooldown,
    aiMaxTokens: config.aiMaxTokens,
    aiContextMessages: config.aiContextMessages,
  });
  const [allowedChannels, setAllowedChannels] = useState<string[]>(config.aiAllowedChannels || []);
  const [newChannelId, setNewChannelId] = useState('');

  useEffect(() => {
    setAiEnabled(config.aiEnabled ?? true);
    setAiReplyOnlyMode(config.aiReplyOnlyMode ?? false);
    setFormData({
      aiBaseUrl: config.aiBaseUrl,
      aiModel: config.aiModel,
      aiApiKey: config.aiApiKey,
      aiPersonality: config.aiPersonality,
      aiResponseChance: config.aiResponseChance,
      aiCooldown: config.aiCooldown,
      aiMaxTokens: config.aiMaxTokens,
      aiContextMessages: config.aiContextMessages,
    });
    setAllowedChannels(config.aiAllowedChannels || []);
  }, [config]);

  const handleToggleAI = async () => {
    try {
      await onSave({ aiEnabled: !aiEnabled });
      setAiEnabled(!aiEnabled);
      toast.success(`AI chat ${!aiEnabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error('Failed to update AI status');
    }
  };

  const handleToggleReplyOnlyMode = async () => {
    try {
      await onSave({ aiReplyOnlyMode: !aiReplyOnlyMode });
      setAiReplyOnlyMode(!aiReplyOnlyMode);
      toast.success(`Reply-only mode ${!aiReplyOnlyMode ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error('Failed to update reply-only mode');
    }
  };

  const handleAddChannel = async () => {
    if (!newChannelId.trim()) {
      toast.error('Please enter a channel ID');
      return;
    }

    if (allowedChannels.includes(newChannelId.trim())) {
      toast.error('Channel already in the list');
      return;
    }

    const updatedChannels = [...allowedChannels, newChannelId.trim()];
    try {
      await onSave({ aiAllowedChannels: updatedChannels });
      setAllowedChannels(updatedChannels);
      setNewChannelId('');
      toast.success('Channel added');
    } catch (error) {
      toast.error('Failed to add channel');
    }
  };

  const handleRemoveChannel = async (channelId: string) => {
    const updatedChannels = allowedChannels.filter(id => id !== channelId);
    try {
      await onSave({ aiAllowedChannels: updatedChannels });
      setAllowedChannels(updatedChannels);
      toast.success('Channel removed');
    } catch (error) {
      toast.error('Failed to remove channel');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
  };

  const maskApiKey = (key: string) => {
    if (!key || key.length < 8) return key;
    return `${key.slice(0, 4)}${'*'.repeat(key.length - 8)}${key.slice(-4)}`;
  };

  return (
    <div className="space-y-5">
      <div className="surface-inset p-4 md:p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-600/15 ring-1 ring-brand-500/30">
              <MessageSquare className="h-4.5 w-4.5 text-brand-300" />
            </span>
            <div className="min-w-0">
              <h4 className="font-medium text-white">Enable AI Chat</h4>
              <p className="mt-0.5 text-xs md:text-sm text-ink-secondary">
                {aiEnabled
                  ? 'Bot will respond to messages in allowed channels'
                  : 'Bot will not respond to any messages'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggleAI}
            disabled={loading}
            data-checked={aiEnabled}
            aria-pressed={aiEnabled}
            aria-label="Toggle AI chat"
            className="switch disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-line-subtle pt-4">
          <div className="flex items-start gap-3 min-w-0">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-surface-3 ring-1 ring-line-default">
              <MessageSquare className="h-4.5 w-4.5 text-ink-secondary" />
            </span>
            <div className="min-w-0">
              <h4 className="font-medium text-white">Reply-Only Mode</h4>
              <p className="mt-0.5 text-xs md:text-sm text-ink-secondary">
                {aiReplyOnlyMode
                  ? 'Bot only responds when mentioned or replied to'
                  : 'Bot responds randomly based on response chance'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggleReplyOnlyMode}
            disabled={loading || !aiEnabled}
            data-checked={aiReplyOnlyMode}
            aria-pressed={aiReplyOnlyMode}
            aria-label="Toggle reply-only mode"
            className="switch disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      <div className="surface-inset p-4 md:p-5">
        <h4 className="font-medium text-white">Allowed Channels</h4>
        <p className="mt-1 text-xs md:text-sm text-ink-secondary">
          {allowedChannels.length === 0
            ? 'Bot can respond in all channels'
            : 'Bot can only respond in these channels'}
        </p>

        <div className="mt-4 flex gap-2">
          <input
            type="text"
            value={newChannelId}
            onChange={(e) => setNewChannelId(e.target.value)}
            placeholder="Enter Channel ID"
            className="input flex-1"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddChannel())}
          />
          <button
            type="button"
            onClick={handleAddChannel}
            disabled={loading}
            className="btn btn-primary"
          >
            <Plus className="h-4 w-4" />
            <span>Add</span>
          </button>
        </div>

        {allowedChannels.length > 0 ? (
          <div className="mt-3 space-y-1.5">
            {allowedChannels.map((channelId) => (
              <div
                key={channelId}
                className="flex items-center justify-between rounded-md border border-line-subtle bg-surface-2 px-3 py-2"
              >
                <span className="font-mono text-sm text-white">#{channelId}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveChannel(channelId)}
                  disabled={loading}
                  aria-label="Remove channel"
                  className="text-red-400 hover:text-red-300 transition disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs text-center text-ink-muted py-3 rounded-md border border-line-subtle bg-surface-2">
            No channel restrictions — bot can respond anywhere
          </p>
        )}

        <div className="mt-4 rounded-md border border-brand-500/20 bg-brand-500/5 px-3 py-2">
          <p className="text-xs text-ink-secondary">
            <strong className="text-brand-300">Tip:</strong> Right-click a channel in Discord → Copy Channel ID (Developer Mode must be enabled)
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label">AI Base URL</label>
          <input
            type="url"
            value={formData.aiBaseUrl}
            onChange={(e) => setFormData({ ...formData, aiBaseUrl: e.target.value })}
            className="input"
            placeholder="https://api.example.com/v1"
          />
        </div>

        <div>
          <label className="label">AI Model</label>
          <input
            type="text"
            value={formData.aiModel}
            onChange={(e) => setFormData({ ...formData, aiModel: e.target.value })}
            className="input"
            placeholder="gpt-4, claude-3-opus, etc."
          />
        </div>

        <div>
          <label className="label">API Key</label>
          <input
            type="password"
            value={formData.aiApiKey}
            onChange={(e) => setFormData({ ...formData, aiApiKey: e.target.value })}
            className="input"
            placeholder="Enter API key"
          />
          {config.aiApiKey && (
            <p className="helper">Current: {maskApiKey(config.aiApiKey)}</p>
          )}
        </div>

        <div>
          <label className="label">Personality</label>
          <textarea
            value={formData.aiPersonality}
            onChange={(e) => setFormData({ ...formData, aiPersonality: e.target.value })}
            rows={4}
            className="textarea"
            placeholder="You are a helpful and friendly Discord bot assistant."
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="label !mb-0">Response Chance</label>
            <span className="text-sm font-semibold text-brand-300 tabular-nums">
              {formData.aiResponseChance}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={formData.aiResponseChance}
            onChange={(e) =>
              setFormData({ ...formData, aiResponseChance: parseInt(e.target.value) })
            }
            className="w-full mt-2 accent-brand-500"
          />
          <div className="mt-1 flex justify-between text-[11px] text-ink-muted">
            <span>Never</span>
            <span>Always</span>
          </div>
        </div>

        <div>
          <label className="label">Cooldown (milliseconds)</label>
          <input
            type="number"
            min="0"
            value={formData.aiCooldown}
            onChange={(e) =>
              setFormData({ ...formData, aiCooldown: parseInt(e.target.value) })
            }
            className="input"
          />
        </div>

        <div>
          <label className="label">Max Tokens</label>
          <input
            type="number"
            min="1"
            max="32000"
            value={formData.aiMaxTokens}
            onChange={(e) =>
              setFormData({ ...formData, aiMaxTokens: parseInt(e.target.value) })
            }
            className="input"
          />
          <p className="helper">
            Maximum number of tokens in AI responses (1–32000). Lower values = shorter responses.
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="label !mb-0">Context Messages</label>
            <span className="text-sm font-semibold text-brand-300 tabular-nums">
              {formData.aiContextMessages}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="50"
            value={formData.aiContextMessages}
            onChange={(e) =>
              setFormData({ ...formData, aiContextMessages: parseInt(e.target.value) })
            }
            className="w-full mt-2 accent-brand-500"
          />
          <div className="mt-1 flex justify-between text-[11px] text-ink-muted">
            <span>No context</span>
            <span>50 messages</span>
          </div>
          <p className="helper">
            Number of previous messages the bot remembers per channel. Higher values = better context but more tokens used.
          </p>
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary w-full btn-lg">
          {loading ? 'Saving…' : 'Save AI Configuration'}
        </button>
      </form>
    </div>
  );
}
