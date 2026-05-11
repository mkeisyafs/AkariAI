import { useState, useEffect } from 'react';
import { Terminal, Shield, Wrench, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import type { GuildConfig } from '../../types';

interface Command {
  name: string;
  description: string;
  category: string;
  adminOnly: boolean;
}

interface CommandsConfigFormProps {
  config: GuildConfig;
  onSave: (updates: Partial<GuildConfig>) => Promise<GuildConfig | undefined>;
  loading: boolean;
  guildId: string;
}

export default function CommandsConfigForm({ config, onSave, loading, guildId }: CommandsConfigFormProps) {
  const [commands, setCommands] = useState<Command[]>([]);
  const [disabledCommands, setDisabledCommands] = useState<string[]>(config.disabledCommands || []);
  const [fetchingCommands, setFetchingCommands] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    setDisabledCommands(config.disabledCommands || []);
  }, [config]);

  useEffect(() => {
    fetchCommands();
  }, [guildId]);

  const fetchCommands = async () => {
    try {
      setFetchingCommands(true);
      const response = await axios.get(`/api/guilds/${guildId}/commands`, {
        withCredentials: true,
      });
      setCommands(response.data.commands);
    } catch (error) {
      console.error('Error fetching commands:', error);
      toast.error('Failed to fetch commands');
    } finally {
      setFetchingCommands(false);
    }
  };

  const toggleCommand = async (commandName: string) => {
    const newDisabledCommands = disabledCommands.includes(commandName)
      ? disabledCommands.filter(cmd => cmd !== commandName)
      : [...disabledCommands, commandName];

    try {
      await onSave({ disabledCommands: newDisabledCommands });
      setDisabledCommands(newDisabledCommands);
      toast.success(
        disabledCommands.includes(commandName)
          ? `Command /${commandName} enabled`
          : `Command /${commandName} disabled`
      );
    } catch (error) {
      toast.error('Failed to update command status');
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'moderation':
        return <Shield className="h-5 w-5 text-red-400" />;
      case 'config':
        return <Wrench className="h-5 w-5 text-blue-400" />;
      case 'utility':
        return <Terminal className="h-5 w-5 text-green-400" />;
      default:
        return <Terminal className="h-5 w-5 text-gray-400" />;
    }
  };

  const filteredCommands = commands.filter(cmd => {
    if (filter === 'all') return true;
    if (filter === 'enabled') return !disabledCommands.includes(cmd.name);
    if (filter === 'disabled') return disabledCommands.includes(cmd.name);
    return cmd.category === filter;
  });

  const categories = ['all', 'enabled', 'disabled', ...new Set(commands.map(cmd => cmd.category))];

  if (fetchingCommands) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Loading commands...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">Command Management</h3>
        <p className="text-sm text-gray-400">
          Enable or disable specific commands for this server. Disabled commands cannot be used by anyone.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setFilter(category)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === category
                ? 'bg-discord-blurple text-white'
                : 'bg-discord-dark text-gray-400 hover:bg-discord-gray'
            }`}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCommands.map(command => {
          const isDisabled = disabledCommands.includes(command.name);
          
          return (
            <div
              key={command.name}
              className={`p-4 rounded-lg border transition ${
                isDisabled
                  ? 'bg-discord-dark border-red-900/50'
                  : 'bg-discord-dark border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {getCategoryIcon(command.category)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-white font-medium">/{command.name}</h4>
                      {command.adminOnly && (
                        <span className="px-2 py-0.5 bg-yellow-900/30 text-yellow-400 text-xs rounded">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 mt-1">{command.description}</p>
                    <p className="text-xs text-gray-500 mt-1 capitalize">{command.category}</p>
                  </div>
                </div>
                
                <button
                  onClick={() => toggleCommand(command.name)}
                  disabled={loading}
                  className={`ml-3 p-2 rounded-lg transition ${
                    isDisabled
                      ? 'bg-red-900/30 hover:bg-red-900/50 text-red-400'
                      : 'bg-green-900/30 hover:bg-green-900/50 text-green-400'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={isDisabled ? 'Enable command' : 'Disable command'}
                >
                  {isDisabled ? (
                    <XCircle className="h-5 w-5" />
                  ) : (
                    <CheckCircle className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCommands.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No commands found for this filter.</p>
        </div>
      )}
    </div>
  );
}
