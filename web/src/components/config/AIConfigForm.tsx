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
    <div className="space-y-6">
      <div className="bg-discord-dark rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <MessageSquare className="h-6 w-6 text-discord-blurple" />
            <div>
              <h4 className="text-white font-medium">Enable AI Chat</h4>
              <p className="text-sm text-gray-400">
                {aiEnabled
                  ? 'Bot will respond to messages in allowed channels'
                  : 'Bot will not respond to any messages'}
              </p>
            </div>
          </div>
          <button
            onClick={handleToggleAI}
            disabled={loading}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
              aiEnabled ? 'bg-discord-blurple' : 'bg-gray-600'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                aiEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="bg-discord-dark rounded-lg p-4 border border-gray-700">
        <h4 className="text-white font-medium mb-3">Allowed Channels</h4>
        <p className="text-sm text-gray-400 mb-4">
          {allowedChannels.length === 0
            ? 'Bot can respond in all channels'
            : 'Bot can only respond in these channels'}
        </p>

        <div className="flex space-x-2 mb-3">
          <input
            type="text"
            value={newChannelId}
            onChange={(e) => setNewChannelId(e.target.value)}
            placeholder="Enter Channel ID"
            className="flex-1 bg-discord-gray border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-discord-blurple"
            onKeyPress={(e) => e.key === 'Enter' && handleAddChannel()}
          />
          <button
            onClick={handleAddChannel}
            disabled={loading}
            className="bg-discord-blurple hover:bg-discord-blurple-dark text-white px-4 py-2 rounded-lg transition disabled:opacity-50 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add</span>
          </button>
        </div>

        {allowedChannels.length > 0 ? (
          <div className="space-y-2">
            {allowedChannels.map((channelId) => (
              <div
                key={channelId}
                className="flex items-center justify-between bg-discord-gray rounded-lg px-4 py-3 border border-gray-700"
              >
                <span className="text-white font-mono text-sm">#{channelId}</span>
                <button
                  onClick={() => handleRemoveChannel(channelId)}
                  disabled={loading}
                  className="text-red-400 hover:text-red-300 transition disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4 bg-discord-gray rounded-lg border border-gray-700">
            No channel restrictions - bot can respond anywhere
          </p>
        )}

        <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3 mt-4">
          <p className="text-xs text-gray-300">
            <strong>Tip:</strong> Right-click a channel in Discord → Copy Channel ID (Developer Mode must be enabled)
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            AI Base URL
          </label>
          <input
            type="url"
            value={formData.aiBaseUrl}
            onChange={(e) => setFormData({ ...formData, aiBaseUrl: e.target.value })}
            className="w-full px-4 py-2 bg-discord-dark border border-gray-700 rounded-lg text-white focus:outline-none focus:border-discord-blurple"
            placeholder="https://api.example.com/v1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            AI Model
          </label>
          <input
            type="text"
            value={formData.aiModel}
            onChange={(e) => setFormData({ ...formData, aiModel: e.target.value })}
            className="w-full px-4 py-2 bg-discord-dark border border-gray-700 rounded-lg text-white focus:outline-none focus:border-discord-blurple"
            placeholder="gpt-4, claude-3-opus, etc."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            API Key
          </label>
          <input
            type="password"
            value={formData.aiApiKey}
            onChange={(e) => setFormData({ ...formData, aiApiKey: e.target.value })}
            className="w-full px-4 py-2 bg-discord-dark border border-gray-700 rounded-lg text-white focus:outline-none focus:border-discord-blurple"
            placeholder="Enter API key"
          />
          {config.aiApiKey && (
            <p className="text-xs text-gray-500 mt-1">
              Current: {maskApiKey(config.aiApiKey)}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Personality
          </label>
          <textarea
            value={formData.aiPersonality}
            onChange={(e) => setFormData({ ...formData, aiPersonality: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 bg-discord-dark border border-gray-700 rounded-lg text-white focus:outline-none focus:border-discord-blurple"
            placeholder="You are a helpful and friendly Discord bot assistant."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Response Chance: {formData.aiResponseChance}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={formData.aiResponseChance}
            onChange={(e) => setFormData({ ...formData, aiResponseChance: parseInt(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Never</span>
            <span>Always</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Cooldown (milliseconds)
          </label>
          <input
            type="number"
            min="0"
            value={formData.aiCooldown}
            onChange={(e) => setFormData({ ...formData, aiCooldown: parseInt(e.target.value) })}
            className="w-full px-4 py-2 bg-discord-dark border border-gray-700 rounded-lg text-white focus:outline-none focus:border-discord-blurple"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Max Tokens
          </label>
          <input
            type="number"
            min="1"
            max="32000"
            value={formData.aiMaxTokens}
            onChange={(e) => setFormData({ ...formData, aiMaxTokens: parseInt(e.target.value) })}
            className="w-full px-4 py-2 bg-discord-dark border border-gray-700 rounded-lg text-white focus:outline-none focus:border-discord-blurple"
          />
          <p className="text-xs text-gray-500 mt-1">
            Maximum number of tokens in AI responses (1-32000). Lower values = shorter responses.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Context Messages: {formData.aiContextMessages}
          </label>
          <input
            type="range"
            min="0"
            max="50"
            value={formData.aiContextMessages}
            onChange={(e) => setFormData({ ...formData, aiContextMessages: parseInt(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>No context</span>
            <span>50 messages</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Number of previous messages the bot remembers per channel. Higher values = better context but more tokens used.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3 bg-discord-blurple hover:bg-blue-600 disabled:bg-gray-600 text-white font-semibold rounded-lg transition"
        >
          {loading ? 'Saving...' : 'Save AI Configuration'}
        </button>
      </form>
    </div>
  );
}
