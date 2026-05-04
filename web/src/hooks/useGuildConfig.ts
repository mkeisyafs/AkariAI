import { useState, useEffect } from 'react';
import { guildsAPI } from '../services/api';
import type { GuildConfig } from '../types';
import toast from 'react-hot-toast';

export function useGuildConfig(guildId: string | null) {
  const [config, setConfig] = useState<GuildConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!guildId) {
      setConfig(null);
      return;
    }

    const fetchConfig = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await guildsAPI.getConfig(guildId);
        setConfig(response.data);
      } catch (err: any) {
        const errorMsg = err.response?.data?.error || 'Failed to fetch configuration';
        setError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [guildId]);

  const updateConfig = async (updates: Partial<GuildConfig>) => {
    if (!guildId) return;

    try {
      setLoading(true);
      const response = await guildsAPI.updateConfig(guildId, updates);
      setConfig(response.data);
      toast.success('Configuration updated successfully');
      return response.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to update configuration';
      setError(errorMsg);
      toast.error(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { config, loading, error, updateConfig };
}
