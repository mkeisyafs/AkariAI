import { useState, useEffect } from 'react';
import { Send, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import type { GuildConfig } from '../../types';

interface VerificationConfigFormProps {
  config: GuildConfig;
  onSave: (updates: Partial<GuildConfig>) => Promise<GuildConfig | undefined>;
  loading: boolean;
  guildId: string;
}

export default function VerificationConfigForm({ config, onSave, loading, guildId }: VerificationConfigFormProps) {
  const [formData, setFormData] = useState({
    verificationEnabled: config.verificationEnabled,
    verificationRoleId: config.verificationRoleId || '',
    verificationChannelId: config.verificationChannelId || '',
    verificationMethod: config.verificationMethod,
    verificationMessage: config.verificationMessage || 'Welcome! Click the button below to verify and gain access to the server.',
    verificationEmoji: config.verificationEmoji || '✅',
    verificationButtonText: config.verificationButtonText || 'Verify',
  });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setFormData({
      verificationEnabled: config.verificationEnabled,
      verificationRoleId: config.verificationRoleId || '',
      verificationChannelId: config.verificationChannelId || '',
      verificationMethod: config.verificationMethod,
      verificationMessage: config.verificationMessage || 'Welcome! Click the button below to verify and gain access to the server.',
      verificationEmoji: config.verificationEmoji || '✅',
      verificationButtonText: config.verificationButtonText || 'Verify',
    });
  }, [config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      ...formData,
      verificationRoleId: formData.verificationRoleId || null,
      verificationChannelId: formData.verificationChannelId || null,
    });
  };

  const handleSendVerificationMessage = async () => {
    if (!formData.verificationChannelId) {
      toast.error('Please set a verification channel first');
      return;
    }

    if (!formData.verificationRoleId) {
      toast.error('Please set a verification role first');
      return;
    }

    setSending(true);
    try {
      await axios.post(`/api/guilds/${guildId}/verification/send`, {
        channelId: formData.verificationChannelId,
        message: formData.verificationMessage,
        emoji: formData.verificationEmoji,
        buttonText: formData.verificationButtonText,
        method: formData.verificationMethod,
      }, {
        withCredentials: true,
      });
      toast.success('Verification message sent successfully!');
    } catch (error: any) {
      console.error('Error sending verification message:', error);
      toast.error(error.response?.data?.error || 'Failed to send verification message');
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between bg-discord-dark rounded-lg p-4 border border-gray-700">
        <div>
          <label className="block text-sm font-medium text-gray-300">
            Enable Verification
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Require new members to verify before accessing the server
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormData({ ...formData, verificationEnabled: !formData.verificationEnabled })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
            formData.verificationEnabled ? 'bg-discord-blurple' : 'bg-gray-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
              formData.verificationEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Verification Role ID
        </label>
        <input
          type="text"
          value={formData.verificationRoleId}
          onChange={(e) => setFormData({ ...formData, verificationRoleId: e.target.value })}
          className="w-full px-4 py-2 bg-discord-dark border border-gray-700 rounded-lg text-white focus:outline-none focus:border-discord-blurple"
          placeholder="Role ID to assign after verification"
        />
        <p className="text-xs text-gray-500 mt-1">
          Right-click a role → Copy ID (Developer Mode must be enabled)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Verification Channel ID
        </label>
        <input
          type="text"
          value={formData.verificationChannelId}
          onChange={(e) => setFormData({ ...formData, verificationChannelId: e.target.value })}
          className="w-full px-4 py-2 bg-discord-dark border border-gray-700 rounded-lg text-white focus:outline-none focus:border-discord-blurple"
          placeholder="Channel ID for verification"
        />
        <p className="text-xs text-gray-500 mt-1">
          Right-click a channel → Copy Channel ID
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Verification Method
        </label>
        <select
          value={formData.verificationMethod}
          onChange={(e) => setFormData({ ...formData, verificationMethod: e.target.value })}
          className="w-full px-4 py-2 bg-discord-dark border border-gray-700 rounded-lg text-white focus:outline-none focus:border-discord-blurple"
        >
          <option value="button">Button</option>
          <option value="reaction">Reaction</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Button: Click a button to verify | Reaction: React with emoji to verify
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Verification Message
        </label>
        <textarea
          value={formData.verificationMessage}
          onChange={(e) => setFormData({ ...formData, verificationMessage: e.target.value })}
          rows={4}
          className="w-full px-4 py-2 bg-discord-dark border border-gray-700 rounded-lg text-white focus:outline-none focus:border-discord-blurple"
          placeholder="Welcome! Click the button below to verify and gain access to the server."
        />
        <p className="text-xs text-gray-500 mt-1">
          This message will be displayed in the verification channel
        </p>
      </div>

      {formData.verificationMethod === 'button' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Button Text
          </label>
          <input
            type="text"
            value={formData.verificationButtonText}
            onChange={(e) => setFormData({ ...formData, verificationButtonText: e.target.value })}
            className="w-full px-4 py-2 bg-discord-dark border border-gray-700 rounded-lg text-white focus:outline-none focus:border-discord-blurple"
            placeholder="Verify"
            maxLength={80}
          />
          <p className="text-xs text-gray-500 mt-1">
            Text displayed on the verification button (max 80 characters)
          </p>
        </div>
      )}

      {formData.verificationMethod === 'reaction' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Verification Emoji
          </label>
          <input
            type="text"
            value={formData.verificationEmoji}
            onChange={(e) => setFormData({ ...formData, verificationEmoji: e.target.value })}
            className="w-full px-4 py-2 bg-discord-dark border border-gray-700 rounded-lg text-white focus:outline-none focus:border-discord-blurple text-2xl"
            placeholder="✅"
            maxLength={10}
          />
          <p className="text-xs text-gray-500 mt-1">
            Emoji users need to react with to verify (use standard emoji or custom emoji ID)
          </p>
        </div>
      )}

      <div className="bg-discord-dark rounded-lg p-4 border border-gray-700">
        <h4 className="text-white font-medium mb-2 flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 text-discord-blurple" />
          <span>Preview</span>
        </h4>
        <div className="bg-discord-gray rounded-lg p-4 border border-gray-600">
          <p className="text-gray-300 whitespace-pre-wrap mb-3">{formData.verificationMessage}</p>
          {formData.verificationMethod === 'button' ? (
            <button
              type="button"
              className="bg-discord-blurple text-white px-4 py-2 rounded cursor-not-allowed"
              disabled
            >
              {formData.verificationButtonText}
            </button>
          ) : (
            <div className="flex items-center space-x-2 text-gray-400">
              <span className="text-2xl">{formData.verificationEmoji}</span>
              <span className="text-sm">React with this emoji to verify</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex space-x-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-6 py-3 bg-discord-blurple hover:bg-blue-600 disabled:bg-gray-600 text-white font-semibold rounded-lg transition"
        >
          {loading ? 'Saving...' : 'Save Configuration'}
        </button>

        <button
          type="button"
          onClick={handleSendVerificationMessage}
          disabled={sending || !formData.verificationChannelId || !formData.verificationRoleId}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold rounded-lg transition flex items-center space-x-2"
        >
          <Send className="h-4 w-4" />
          <span>{sending ? 'Sending...' : 'Send Message'}</span>
        </button>
      </div>

      <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
        <h4 className="text-blue-400 font-medium mb-2">Instructions:</h4>
        <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
          <li>Create a verification role and copy its ID</li>
          <li>Create or choose a verification channel and copy its ID</li>
          <li>Configure the verification message and method</li>
          <li>Save the configuration</li>
          <li>Click "Send Message" to post the verification message to the channel</li>
        </ol>
      </div>
    </form>
  );
}
