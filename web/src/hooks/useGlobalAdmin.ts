import { useEffect, useState } from 'react';
import api from '../services/api';

export function useGlobalAdmin() {
  const [isGlobalAdmin, setIsGlobalAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api.get<{ isGlobalAdmin: boolean }>('/me');
        if (alive) setIsGlobalAdmin(!!res.data?.isGlobalAdmin);
      } catch {
        if (alive) setIsGlobalAdmin(false);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { isGlobalAdmin, loading };
}
