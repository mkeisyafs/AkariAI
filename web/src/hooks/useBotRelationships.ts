import { useCallback, useEffect, useState } from 'react';
import { botRelationshipsApi } from '../services/botRelationshipsApi';
import type { BotLoreBot, BotRelationship } from '../types';

function apiError(e: unknown, fallback: string): string {
  const err = e as { response?: { data?: { error?: string } }; message?: string };
  return err?.response?.data?.error || err?.message || fallback;
}

export function useBotRelationships(guildId: string | undefined) {
  const [bots, setBots] = useState<BotLoreBot[]>([]);
  const [relationships, setRelationships] = useState<BotRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!guildId) {
      setBots([]);
      setRelationships([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await botRelationshipsApi.get(guildId);
      setBots(data.bots);
      setRelationships(data.relationships);
    } catch (e: unknown) {
      setError(apiError(e, 'Failed to load bot relationships'));
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const upsert = useCallback(
    async (fromBotId: string, toBotId: string, relationship: string | null) => {
      if (!guildId) throw new Error('Missing guildId');
      const res = await botRelationshipsApi.upsert(guildId, fromBotId, toBotId, relationship);
      setRelationships(prev => {
        const without = prev.filter(
          r => !(r.fromBotId === fromBotId && r.toBotId === toBotId)
        );
        return res.relationship ? [...without, res.relationship] : without;
      });
      return res.relationship;
    },
    [guildId]
  );

  const remove = useCallback(
    async (fromBotId: string, toBotId: string) => {
      if (!guildId) throw new Error('Missing guildId');
      await botRelationshipsApi.delete(guildId, fromBotId, toBotId);
      setRelationships(prev =>
        prev.filter(r => !(r.fromBotId === fromBotId && r.toBotId === toBotId))
      );
    },
    [guildId]
  );

  return { bots, relationships, loading, error, refresh, upsert, remove };
}
