import { useState, useEffect } from 'react';
import { Lock, UserPlus, Shield, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { GuildConfig } from '../../types';

interface WhitelistConfigFormProps {
  config: GuildConfig;
  onSave: (updates: Partial<GuildConfig>) => Promise<GuildConfig | undefined>;
  loading: boolean;
}

export default function WhitelistConfigForm({ config, onSave, loading }: WhitelistConfigFormProps) {
  const [enabled, setEnabled] = useState(config.whitelistEnabled || false);
  const [userIds, setUserIds] = useState<string[]>(config.whitelistUserIds || []);
  const [roleIds, setRoleIds] = useState<string[]>(config.whitelistRoleIds || []);
  const [newUserId, setNewUserId] = useState('');
  const [newRoleId, setNewRoleId] = useState('');

  useEffect(() => {
    setEnabled(config.whitelistEnabled || false);
    setUserIds(config.whitelistUserIds || []);
    setRoleIds(config.whitelistRoleIds || []);
  }, [config]);

  const handleToggleEnabled = async () => {
    try {
      await onSave({ whitelistEnabled: !enabled });
      setEnabled(!enabled);
      toast.success(`Whitelist ${!enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error('Failed to update whitelist status');
    }
  };

  const handleAddUser = async () => {
    if (!newUserId.trim()) {
      toast.error('Please enter a user ID');
      return;
    }

    if (userIds.includes(newUserId.trim())) {
      toast.error('User already in whitelist');
      return;
    }

    const updatedUserIds = [...userIds, newUserId.trim()];
    try {
      await onSave({ whitelistUserIds: updatedUserIds });
      setUserIds(updatedUserIds);
      setNewUserId('');
      toast.success('User added to whitelist');
    } catch (error) {
      toast.error('Failed to add user');
    }
  };

  const handleRemoveUser = async (userId: string) => {
    const updatedUserIds = userIds.filter(id => id !== userId);
    try {
      await onSave({ whitelistUserIds: updatedUserIds });
      setUserIds(updatedUserIds);
      toast.success('User removed from whitelist');
    } catch (error) {
      toast.error('Failed to remove user');
    }
  };

  const handleAddRole = async () => {
    if (!newRoleId.trim()) {
      toast.error('Please enter a role ID');
      return;
    }

    if (roleIds.includes(newRoleId.trim())) {
      toast.error('Role already in whitelist');
      return;
    }

    const updatedRoleIds = [...roleIds, newRoleId.trim()];
    try {
      await onSave({ whitelistRoleIds: updatedRoleIds });
      setRoleIds(updatedRoleIds);
      setNewRoleId('');
      toast.success('Role added to whitelist');
    } catch (error) {
      toast.error('Failed to add role');
    }
  };

  const handleRemoveRole = async (roleId: string) => {
    const updatedRoleIds = roleIds.filter(id => id !== roleId);
    try {
      await onSave({ whitelistRoleIds: updatedRoleIds });
      setRoleIds(updatedRoleIds);
      toast.success('Role removed from whitelist');
    } catch (error) {
      toast.error('Failed to remove role');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start space-x-3">
        <Lock className="h-6 w-6 text-discord-blurple mt-1" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-2">Dashboard Access Whitelist</h3>
          <p className="text-sm text-gray-400 mb-4">
            Control who can access this server's dashboard. When enabled, only whitelisted users and roles can view and edit settings.
          </p>
        </div>
      </div>

      <div className="bg-discord-dark rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-white font-medium">Enable Whitelist</h4>
            <p className="text-sm text-gray-400">
              {enabled
                ? 'Only whitelisted users/roles can access dashboard'
                : 'All server administrators can access dashboard'}
            </p>
          </div>
          <button
            onClick={handleToggleEnabled}
            disabled={loading}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
              enabled ? 'bg-discord-blurple' : 'bg-gray-600'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <UserPlus className="h-5 w-5 text-gray-400" />
            <h4 className="text-white font-medium">Whitelisted Users</h4>
          </div>

          <div className="flex space-x-2 mb-3">
            <input
              type="text"
              value={newUserId}
              onChange={(e) => setNewUserId(e.target.value)}
              placeholder="Enter Discord User ID"
              className="flex-1 bg-discord-dark border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-discord-blurple"
              onKeyPress={(e) => e.key === 'Enter' && handleAddUser()}
            />
            <button
              onClick={handleAddUser}
              disabled={loading}
              className="bg-discord-blurple hover:bg-discord-blurple-dark text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
            >
              Add
            </button>
          </div>

          {userIds.length > 0 ? (
            <div className="space-y-2">
              {userIds.map((userId) => (
                <div
                  key={userId}
                  className="flex items-center justify-between bg-discord-dark rounded-lg px-4 py-3 border border-gray-700"
                >
                  <div className="flex items-center space-x-3">
                    <Shield className="h-4 w-4 text-gray-400" />
                    <span className="text-white font-mono text-sm">{userId}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveUser(userId)}
                    disabled={loading}
                    className="text-red-400 hover:text-red-300 transition disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4 bg-discord-dark rounded-lg border border-gray-700">
              No users whitelisted
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center space-x-2 mb-3">
            <Shield className="h-5 w-5 text-gray-400" />
            <h4 className="text-white font-medium">Whitelisted Roles</h4>
          </div>

          <div className="flex space-x-2 mb-3">
            <input
              type="text"
              value={newRoleId}
              onChange={(e) => setNewRoleId(e.target.value)}
              placeholder="Enter Discord Role ID"
              className="flex-1 bg-discord-dark border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-discord-blurple"
              onKeyPress={(e) => e.key === 'Enter' && handleAddRole()}
            />
            <button
              onClick={handleAddRole}
              disabled={loading}
              className="bg-discord-blurple hover:bg-discord-blurple-dark text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
            >
              Add
            </button>
          </div>

          {roleIds.length > 0 ? (
            <div className="space-y-2">
              {roleIds.map((roleId) => (
                <div
                  key={roleId}
                  className="flex items-center justify-between bg-discord-dark rounded-lg px-4 py-3 border border-gray-700"
                >
                  <div className="flex items-center space-x-3">
                    <Shield className="h-4 w-4 text-gray-400" />
                    <span className="text-white font-mono text-sm">{roleId}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveRole(roleId)}
                    disabled={loading}
                    className="text-red-400 hover:text-red-300 transition disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4 bg-discord-dark rounded-lg border border-gray-700">
              No roles whitelisted
            </p>
          )}
        </div>
      </div>

      <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
        <h4 className="text-blue-400 font-medium mb-2">How to get IDs:</h4>
        <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
          <li>Enable Developer Mode in Discord (Settings → Advanced → Developer Mode)</li>
          <li>Right-click on a user or role</li>
          <li>Click "Copy ID"</li>
          <li>Paste the ID here</li>
        </ol>
      </div>
    </div>
  );
}
