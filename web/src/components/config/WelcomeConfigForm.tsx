import { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import type { GuildConfig } from '../../types';

interface WelcomeConfigFormProps {
  config: GuildConfig;
  onSave: (updates: Partial<GuildConfig>) => Promise<GuildConfig | undefined>;
  loading: boolean;
  guildId: string;
}

export default function WelcomeConfigForm({ config, onSave, loading, guildId }: WelcomeConfigFormProps) {
  const [formData, setFormData] = useState({
    welcomeEnabled: config.welcomeEnabled,
    welcomeChannelId: config.welcomeChannelId || '',
    welcomeMessage: config.welcomeMessage,
    welcomeUseEmbed: config.welcomeUseEmbed,
    autoRoleEnabled: config.autoRoleEnabled,
    autoRoleIds: (config.autoRoleIds || []).join('\n'),
    goodbyeEnabled: config.goodbyeEnabled,
    goodbyeChannelId: config.goodbyeChannelId || '',
    goodbyeMessage: config.goodbyeMessage || 'Goodbye {user}, we\'ll miss you!',
    goodbyeUseEmbed: config.goodbyeUseEmbed,
  });
  const [testingWelcome, setTestingWelcome] = useState(false);
  const [testingGoodbye, setTestingGoodbye] = useState(false);

  useEffect(() => {
    setFormData({
      welcomeEnabled: config.welcomeEnabled,
      welcomeChannelId: config.welcomeChannelId || '',
      welcomeMessage: config.welcomeMessage,
      welcomeUseEmbed: config.welcomeUseEmbed,
      autoRoleEnabled: config.autoRoleEnabled,
      autoRoleIds: (config.autoRoleIds || []).join('\n'),
      goodbyeEnabled: config.goodbyeEnabled,
      goodbyeChannelId: config.goodbyeChannelId || '',
      goodbyeMessage: config.goodbyeMessage || 'Goodbye {user}, we\'ll miss you!',
      goodbyeUseEmbed: config.goodbyeUseEmbed,
    });
  }, [config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      ...formData,
      welcomeChannelId: formData.welcomeChannelId || null,
      goodbyeChannelId: formData.goodbyeChannelId || null,
      autoRoleIds: formData.autoRoleIds
        .split('\n')
        .map(id => id.trim())
        .filter(id => id.length > 0),
    });
  };

  const handleTestWelcome = async () => {
    if (!formData.welcomeChannelId) {
      toast.error('Please set a welcome channel first');
      return;
    }

    setTestingWelcome(true);
    try {
      await axios.post(`/api/guilds/${guildId}/welcome/test`, {}, {
        withCredentials: true,
      });
      toast.success('Test welcome message sent!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send test welcome message');
    } finally {
      setTestingWelcome(false);
    }
  };

  const handleTestGoodbye = async () => {
    if (!formData.goodbyeChannelId) {
      toast.error('Please set a goodbye channel first');
      return;
    }

    setTestingGoodbye(true);
    try {
      await axios.post(`/api/guilds/${guildId}/goodbye/test`, {}, {
        withCredentials: true,
      });
      toast.success('Test goodbye message sent!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send test goodbye message');
    } finally {
      setTestingGoodbye(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Welcome Messages</h3>
        <div className="space-y-6">
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
              Variables: {'{user}'} - mentions the user, {'{server}'} - server name, {'{memberCount}'} - member count
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
            type="button"
            onClick={handleTestWelcome}
            disabled={testingWelcome || !formData.welcomeChannelId}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition flex items-center space-x-2"
          >
            <Send className="h-4 w-4" />
            <span>{testingWelcome ? 'Sending...' : 'Test Welcome Message'}</span>
          </button>
        </div>
      </div>

      <hr className="border-gray-700" />

      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Auto-Role Assignment</h3>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Enable Auto-Role
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Automatically assign roles when members join
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, autoRoleEnabled: !formData.autoRoleEnabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                formData.autoRoleEnabled ? 'bg-discord-blurple' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  formData.autoRoleEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Role IDs
            </label>
            <textarea
              value={formData.autoRoleIds}
              onChange={(e) => setFormData({ ...formData, autoRoleIds: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 bg-discord-dark border border-gray-700 rounded-lg text-white focus:outline-none focus:border-discord-blurple"
              placeholder="Enter role IDs (one per line)"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter role IDs to automatically assign when members join (one per line). Right-click a role in Discord → Copy ID
            </p>
          </div>
        </div>
      </div>

      <hr className="border-gray-700" />

      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Goodbye Messages</h3>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Enable Goodbye Messages
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Send a message when members leave the server
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, goodbyeEnabled: !formData.goodbyeEnabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                formData.goodbyeEnabled ? 'bg-discord-blurple' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  formData.goodbyeEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Goodbye Channel ID
            </label>
            <input
              type="text"
              value={formData.goodbyeChannelId}
              onChange={(e) => setFormData({ ...formData, goodbyeChannelId: e.target.value })}
              className="w-full px-4 py-2 bg-discord-dark border border-gray-700 rounded-lg text-white focus:outline-none focus:border-discord-blurple"
              placeholder="Channel ID for goodbye messages"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Goodbye Message
            </label>
            <textarea
              value={formData.goodbyeMessage}
              onChange={(e) => setFormData({ ...formData, goodbyeMessage: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 bg-discord-dark border border-gray-700 rounded-lg text-white focus:outline-none focus:border-discord-blurple"
              placeholder="Goodbye {user}, we'll miss you!"
            />
            <p className="text-xs text-gray-500 mt-1">
              Variables: {'{user}'} - username, {'{server}'} - server name, {'{memberCount}'} - member count
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={formData.goodbyeUseEmbed}
              onChange={(e) => setFormData({ ...formData, goodbyeUseEmbed: e.target.checked })}
              className="h-4 w-4 rounded border-gray-700 bg-discord-dark text-discord-blurple focus:ring-discord-blurple"
            />
            <label className="text-gray-300">Use Embed Format</label>
          </div>

          <button
            type="button"
            onClick={handleTestGoodbye}
            disabled={testingGoodbye || !formData.goodbyeChannelId}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition flex items-center space-x-2"
          >
            <Send className="h-4 w-4" />
            <span>{testingGoodbye ? 'Sending...' : 'Test Goodbye Message'}</span>
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full px-6 py-3 bg-discord-blurple hover:bg-blue-600 disabled:bg-gray-600 text-white font-semibold rounded-lg transition"
      >
        {loading ? 'Saving...' : 'Save Configuration'}
      </button>
    </form>
  );
}
