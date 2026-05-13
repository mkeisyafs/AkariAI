import { useCallback, useEffect, useState } from 'react';
import { guildBotsApi } from '../services/guildBotsApi';
import type { GuildBotEntry, GuildBotSettings } from '../types';

export function useGuildBots(guildId: string | undefined) {
  const [items, setItems] = useState<GuildBotEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!guildId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await guildBotsApi.list(guildId);
      setItems(data);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load guild bots');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateBot = useCallback(
    async (botId: string, patch: Partial<GuildBotSettings>) => {
      if (!guildId) return;
      await guildBotsApi.update(guildId, botId, patch);
      await refresh();
    },
    [guildId, refresh]
  );

  const redeployCommands = useCallback(
    async (botId: string) => {
      if (!guildId) return null;
      const result = await guildBotsApi.redeployCommands(guildId, botId);
      await refresh();
      return result;
    },
    [guildId, refresh]
  );

  return { items, loading, error, refresh, updateBot, redeployCommands };
}
