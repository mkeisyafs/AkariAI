import { useState, useEffect } from 'react';
import type { GuildConfig } from '../../types';

interface WelcomeConfigFormProps {
  config: GuildConfig;
  onSave: (updates: Partial<GuildConfig>) => Promise<GuildConfig | undefined>;
  loading: boolean;
}

export default function WelcomeConfigForm({ config, onSave, loading }: WelcomeConfigFormProps) {
  const [formData, setFormData] = useState({
    welcomeEnabled: config.welcomeEnabled,
    welcomeChannelId: config.welcomeChannelId || '',
    welcomeMessage: config.welcomeMessage,
    welcomeUseEmbed: config.welcomeUseEmbed,
  });

  useEffect(() => {
    setFormData({
      welcomeEnabled: config.welcomeEnabled,
      welcomeChannelId: config.welcomeChannelId || '',
      welcomeMessage: config.welcomeMessage,
      welcomeUseEmbed: config.welcomeUseEmbed,
    });
  }, [config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      ...formData,
      welcomeChannelId: formData.welcomeChannelId || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-medium text-gray-300">
            Enable Welcome Messages
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Send a message when new members join
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormData({ ...formData, welcomeEnabled: !formData.welcomeEnabled })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
            formData.welcomeEnabled ? 'bg-discord-blurple' : 'bg-gray-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
              formData.welcomeEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Welcome Channel ID
        </label>
        <input
          type="text"
          value={formData.welcomeChannelId}
          onChange={(e) => setFormData({ ...formData, welcomeChannelId: e.target.value })}
          className="w-full px-4 py-2 bg-discord-dark border border-gray-700 rounded-lg text-white focus:outline-none focus:border-discord-blurple"
          placeholder="Channel ID for welcome messages"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Welcome Message
        </label>
        <textarea
          value={formData.welcomeMessage}
          onChange={(e) => setFormData({ ...formData, welcomeMessage: e.target.value })}
          rows={4}
          className="w-full px-4 py-2 bg-discord-dark border border-gray-700 rounded-lg text-white focus:outline-none focus:border-discord-blurple"
          placeholder="Welcome {user} to {server}!"
        />
        <p className="text-xs text-gray-500 mt-1">
          Variables: {'{user}'} - mentions the user, {'{server}'} - server name
        </p>
      </div>

      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          checked={formData.welcomeUseEmbed}
          onChange={(e) => setFormData({ ...formData, welcomeUseEmbed: e.target.checked })}
          className="h-4 w-4 rounded border-gray-700 bg-discord-dark text-discord-blurple focus:ring-discord-blurple"
        />
        <label className="text-gray-300">Use Embed Format</label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full px-6 py-3 bg-discord-blurple hover:bg-blue-600 disabled:bg-gray-600 text-white font-semibold rounded-lg transition"
      >
        {loading ? 'Saving...' : 'Save Welcome Configuration'}
      </button>
    </form>
  );
}
