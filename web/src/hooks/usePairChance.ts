import { useCallback, useEffect, useMemo, useState } from 'react';
import { pairChanceApi } from '../services/pairChanceApi';
import type { PairMatrix } from '../types';

export function usePairChance(guildId: string | undefined) {
  const [matrix, setMatrix] = useState<PairMatrix>({});
  const [original, setOriginal] = useState<PairMatrix>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!guildId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await pairChanceApi.get(guildId);
      setMatrix(data);
      setOriginal(data);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load matrix');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setCell = useCallback(
    (speakerId: string, targetId: string, chance: number) => {
      setMatrix(prev => ({
        ...prev,
        [speakerId]: { ...(prev[speakerId] || {}), [targetId]: chance },
      }));
    },
    []
  );

  const isDirty = useMemo(
    () => JSON.stringify(matrix) !== JSON.stringify(original),
    [matrix, original]
  );

  const save = useCallback(async () => {
    if (!guildId) return;
    const data = await pairChanceApi.put(guildId, matrix);
    setMatrix(data);
    setOriginal(data);
  }, [guildId, matrix]);

  const revert = useCallback(() => setMatrix(original), [original]);

  return { matrix, loading, error, refresh, setCell, save, revert, isDirty };
}
