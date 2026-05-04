import { useState, useEffect } from 'react';
import type { GuildConfig } from '../../types';

interface ModerationConfigFormProps {
  config: GuildConfig;
  onSave: (updates: Partial<GuildConfig>) => Promise<GuildConfig | undefined>;
  loading: boolean;
}

export default function ModerationConfigForm({ config, onSave, loading }: ModerationConfigFormProps) {
  const [formData, setFormData] = useState({
    moderationEnabled: config.moderationEnabled,
    moderationToxicityThreshold: config.moderationToxicityThreshold,
    moderationAutoWarn: config.moderationAutoWarn,
    moderationAutoMute: config.moderationAutoMute,
    moderationAutoKick: config.moderationAutoKick,
    moderationAutoBan: config.moderationAutoBan,
    moderationLogChannelId: config.moderationLogChannelId || '',
  });

  useEffect(() => {
    setFormData({
      moderationEnabled: config.moderationEnabled,
      moderationToxicityThreshold: config.moderationToxicityThreshold,
      moderationAutoWarn: config.moderationAutoWarn,
      moderationAutoMute: config.moderationAutoMute,
      moderationAutoKick: config.moderationAutoKick,
      moderationAutoBan: config.moderationAutoBan,
      moderationLogChannelId: config.moderationLogChannelId || '',
    });
  }, [config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      ...formData,
      moderationLogChannelId: formData.moderationLogChannelId || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-medium text-gray-300">
            Enable Moderation
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Automatically detect and act on toxic messages
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormData({ ...formData, moderationEnabled: !formData.moderationEnabled })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
            formData.moderationEnabled ? 'bg-discord-blurple' : 'bg-gray-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
              formData.moderationEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Toxicity Threshold: {formData.moderationToxicityThreshold.toFixed(2)}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={formData.moderationToxicityThreshold}
          onChange={(e) => setFormData({ ...formData, moderationToxicityThreshold: parseFloat(e.target.value) })}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Lenient (0.0)</span>
          <span>Strict (1.0)</span>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-300">Auto Actions</h4>

        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={formData.moderationAutoWarn}
            onChange={(e) => setFormData({ ...formData, moderationAutoWarn: e.target.checked })}
            className="h-4 w-4 rounded border-gray-700 bg-discord-dark text-discord-blurple focus:ring-discord-blurple"
          />
          <span className="text-gray-300">Auto Warn</span>
        </label>

        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={formData.moderationAutoMute}
            onChange={(e) => setFormData({ ...formData, moderationAutoMute: e.target.checked })}
            className="h-4 w-4 rounded border-gray-700 bg-discord-dark text-discord-blurple focus:ring-discord-blurple"
          />
          <span className="text-gray-300">Auto Mute</span>
        </label>

        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={formData.moderationAutoKick}
            onChange={(e) => setFormData({ ...formData, moderationAutoKick: e.target.checked })}
            className="h-4 w-4 rounded border-gray-700 bg-discord-dark text-discord-blurple focus:ring-discord-blurple"
          />
          <span className="text-gray-300">Auto Kick</span>
        </label>

        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={formData.moderationAutoBan}
            onChange={(e) => setFormData({ ...formData, moderationAutoBan: e.target.checked })}
            className="h-4 w-4 rounded border-gray-700 bg-discord-dark text-discord-blurple focus:ring-discord-blurple"
          />
          <span className="text-gray-300">Auto Ban</span>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Log Channel ID
        </label>
        <input
          type="text"
          value={formData.moderationLogChannelId}
          onChange={(e) => setFormData({ ...formData, moderationLogChannelId: e.target.value })}
          className="w-full px-4 py-2 bg-discord-dark border border-gray-700 rounded-lg text-white focus:outline-none focus:border-discord-blurple"
          placeholder="Channel ID for moderation logs"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full px-6 py-3 bg-discord-blurple hover:bg-blue-600 disabled:bg-gray-600 text-white font-semibold rounded-lg transition"
      >
        {loading ? 'Saving...' : 'Save Moderation Configuration'}
      </button>
    </form>
  );
}
