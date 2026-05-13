import { useCallback, useEffect, useState } from 'react';
import { adminBotsApi } from '../services/adminBotsApi';
import type { Bot, CreateBotInput, UpdateBotInput } from '../types';

export function useBots() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminBotsApi.list();
      setBots(data);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load bots');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createBot = useCallback(
    async (input: CreateBotInput) => {
      const created = await adminBotsApi.create(input);
      await refresh();
      return created;
    },
    [refresh]
  );

  const updateBot = useCallback(
    async (id: string, patch: UpdateBotInput) => {
      const updated = await adminBotsApi.update(id, patch);
      await refresh();
      return updated;
    },
    [refresh]
  );

  const rotateToken = useCallback(
    async (id: string, newToken: string) => {
      const r = await adminBotsApi.rotateToken(id, newToken);
      await refresh();
      return r;
    },
    [refresh]
  );

  const rotateApiKey = useCallback(
    async (id: string, newApiKey: string) => {
      await adminBotsApi.rotateApiKey(id, newApiKey);
      await refresh();
    },
    [refresh]
  );

  const deleteBot = useCallback(
    async (id: string) => {
      await adminBotsApi.remove(id);
      await refresh();
    },
    [refresh]
  );

  const restartBot = useCallback(
    async (id: string) => {
      const r = await adminBotsApi.restart(id);
      await refresh();
      return r;
    },
    [refresh]
  );

  return {
    bots,
    loading,
    error,
    refresh,
    createBot,
    updateBot,
    rotateToken,
    rotateApiKey,
    deleteBot,
    restartBot,
  };
}
