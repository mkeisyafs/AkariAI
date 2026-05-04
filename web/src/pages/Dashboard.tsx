import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { guildsAPI } from '../services/api';
import { Server, Loader2 } from 'lucide-react';
import type { Guild } from '../types';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGuilds = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await guildsAPI.getGuilds();
        setGuilds(response.data);
      } catch (err: any) {
        console.error('Error fetching guilds:', err);
        setError(err.response?.data?.message || 'Failed to load servers');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchGuilds();
    }
  }, [user]);

  const handleGuildSelect = (guildId: string) => {
    navigate(`/guild/${guildId}`);
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-discord-blurple animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <Server className="h-12 w-12 md:h-16 md:w-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg md:text-xl font-semibold text-red-400 mb-2">Error loading servers</h3>
        <p className="text-sm md:text-base text-gray-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-sm md:text-base text-gray-400">Select a server to manage its configuration</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {guilds.map((guild) => (
          <button
            key={guild.id}
            onClick={() => handleGuildSelect(guild.id)}
            className="bg-discord-gray hover:bg-discord-dark border border-gray-700 hover:border-discord-blurple rounded-lg p-4 md:p-6 transition text-left group"
          >
            <div className="flex items-center space-x-3 md:space-x-4">
              {guild.icon ? (
                <img
                  src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                  alt={guild.name}
                  className="h-12 w-12 md:h-16 md:w-16 rounded-full flex-shrink-0"
                />
              ) : (
                <div className="h-12 w-12 md:h-16 md:w-16 rounded-full bg-discord-blurple flex items-center justify-center flex-shrink-0">
                  <Server className="h-6 w-6 md:h-8 md:w-8 text-white" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-base md:text-lg font-semibold text-white truncate group-hover:text-discord-blurple transition">
                  {guild.name}
                </h3>
                {guild.owner && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400 mt-1">
                    Owner
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {guilds.length === 0 && (
        <div className="text-center py-12">
          <Server className="h-12 w-12 md:h-16 md:w-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg md:text-xl font-semibold text-gray-400 mb-2">No servers found</h3>
          <p className="text-sm md:text-base text-gray-500">
            You need administrator permissions in a server to manage it here.
          </p>
        </div>
      )}
    </div>
  );
}
