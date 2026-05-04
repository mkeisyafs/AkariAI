import { useState, useEffect } from 'react';
import { Plus, X, Trash2 } from 'lucide-react';
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
    moderationBannedWords: config.moderationBannedWords || [],
    moderationWarnPunishments: config.moderationWarnPunishments || [],
  });

  const [newWord, setNewWord] = useState('');
  const [newPunishment, setNewPunishment] = useState({ warns: 1, action: 'warn', duration: 5 });

  useEffect(() => {
    setFormData({
      moderationEnabled: config.moderationEnabled,
      moderationToxicityThreshold: config.moderationToxicityThreshold,
      moderationAutoWarn: config.moderationAutoWarn,
      moderationAutoMute: config.moderationAutoMute,
      moderationAutoKick: config.moderationAutoKick,
      moderationAutoBan: config.moderationAutoBan,
      moderationLogChannelId: config.moderationLogChannelId || '',
      moderationBannedWords: config.moderationBannedWords || [],
      moderationWarnPunishments: config.moderationWarnPunishments || [],
    });
  }, [config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      ...formData,
      moderationLogChannelId: formData.moderationLogChannelId || null,
    });
  };

  const addWord = () => {
    const word = newWord.trim().toLowerCase();
    if (!word || formData.moderationBannedWords.includes(word)) return;
    setFormData({
      ...formData,
      moderationBannedWords: [...formData.moderationBannedWords, word],
    });
    setNewWord('');
  };

  const removeWord = (word: string) => {
    setFormData({
      ...formData,
      moderationBannedWords: formData.moderationBannedWords.filter(w => w !== word),
    });
  };

  const addPunishment = () => {
    const existing = formData.moderationWarnPunishments.findIndex(p => p.warns === newPunishment.warns);
    let updated;
    if (existing !== -1) {
      updated = [...formData.moderationWarnPunishments];
      updated[existing] = { ...newPunishment };
    } else {
      updated = [...formData.moderationWarnPunishments, { ...newPunishment }];
    }
    updated.sort((a, b) => a.warns - b.warns);
    setFormData({ ...formData, moderationWarnPunishments: updated });
  };

  const removePunishment = (warns: number) => {
    setFormData({
      ...formData,
      moderationWarnPunishments: formData.moderationWarnPunishments.filter(p => p.warns !== warns),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-medium text-gray-300">
            Enable Moderation
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Automatically detect and act on banned words
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

      <hr className="border-gray-700" />

      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Banned Words</h3>
        <div className="flex space-x-2 mb-3">
          <input
            type="text"
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addWord(); } }}
            className="flex-1 px-4 py-2 bg-discord-dark border border-gray-700 rounded-lg text-white focus:outline-none focus:border-discord-blurple"
            placeholder="Type a word to ban..."
          />
          <button
            type="button"
            onClick={addWord}
            className="px-4 py-2 bg-discord-blurple hover:bg-blue-600 text-white rounded-lg transition flex items-center space-x-1"
          >
            <Plus className="h-4 w-4" />
            <span>Add</span>
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.moderationBannedWords.map((word) => (
            <span
              key={word}
              className="inline-flex items-center space-x-1 px-3 py-1 bg-red-900/30 border border-red-700/50 rounded-full text-sm text-red-300"
            >
              <span>{word}</span>
              <button type="button" onClick={() => removeWord(word)} className="hover:text-red-100">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {formData.moderationBannedWords.length === 0 && (
            <p className="text-sm text-gray-500">No banned words configured</p>
          )}
        </div>
      </div>

      <hr className="border-gray-700" />

      <div>
        <h3 className="text-lg font-semibold text-white mb-2">Punishment Escalation</h3>
        <p className="text-xs text-gray-500 mb-4">
          Configure what happens when a user reaches X warnings. Higher warning rules override lower ones.
        </p>

        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Warnings</label>
            <input
              type="number"
              min={1}
              value={newPunishment.warns}
              onChange={(e) => setNewPunishment({ ...newPunishment, warns: parseInt(e.target.value) || 1 })}
              className="w-20 px-3 py-2 bg-discord-dark border border-gray-700 rounded-lg text-white focus:outline-none focus:border-discord-blurple"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Action</label>
            <select
              value={newPunishment.action}
              onChange={(e) => setNewPunishment({ ...newPunishment, action: e.target.value })}
              className="px-3 py-2 bg-discord-dark border border-gray-700 rounded-lg text-white focus:outline-none focus:border-discord-blurple"
            >
              <option value="warn">Warn</option>
              <option value="mute">Mute</option>
              <option value="kick">Kick</option>
              <option value="ban">Ban</option>
            </select>
          </div>
          {newPunishment.action === 'mute' && (
            <div>
              <label className="block text-xs text-gray-400 mb-1">Duration (min)</label>
              <input
                type="number"
                min={1}
                value={newPunishment.duration}
                onChange={(e) => setNewPunishment({ ...newPunishment, duration: parseInt(e.target.value) || 5 })}
                className="w-24 px-3 py-2 bg-discord-dark border border-gray-700 rounded-lg text-white focus:outline-none focus:border-discord-blurple"
              />
            </div>
          )}
          <button
            type="button"
            onClick={addPunishment}
            className="px-4 py-2 bg-discord-blurple hover:bg-blue-600 text-white rounded-lg transition flex items-center space-x-1"
          >
            <Plus className="h-4 w-4" />
            <span>Add Rule</span>
          </button>
        </div>

        <div className="space-y-2">
          {formData.moderationWarnPunishments.map((p) => (
            <div
              key={p.warns}
              className="flex items-center justify-between px-4 py-3 bg-discord-dark border border-gray-700 rounded-lg"
            >
              <div className="text-gray-300">
                <span className="font-medium text-white">{p.warns}x</span> warning(s) →{' '}
                <span className={`font-medium ${
                  p.action === 'ban' ? 'text-red-400' :
                  p.action === 'kick' ? 'text-orange-400' :
                  p.action === 'mute' ? 'text-yellow-400' : 'text-blue-400'
                }`}>
                  {p.action.toUpperCase()}
                </span>
                {p.action === 'mute' && <span className="text-gray-400"> ({p.duration} min)</span>}
              </div>
              <button
                type="button"
                onClick={() => removePunishment(p.warns)}
                className="text-gray-500 hover:text-red-400 transition"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {formData.moderationWarnPunishments.length === 0 && (
            <p className="text-sm text-gray-500">No punishment rules configured. Default: warn on every violation.</p>
          )}
        </div>
      </div>

      <hr className="border-gray-700" />

      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-300">Fallback Auto Actions (when no escalation rule matches)</h4>

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
          <span className="text-gray-300">Auto Mute (5 min fallback)</span>
        </label>
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
