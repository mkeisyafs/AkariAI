import { useEffect, useState } from 'react';
import api from '../services/api';

export interface SessionUser {
  userId: string;
  username: string;
  avatar: string | null;
  isGlobalAdmin: boolean;
}

let cached: SessionUser | null = null;
let inflight: Promise<SessionUser | null> | null = null;
const subscribers = new Set<(u: SessionUser | null) => void>();

function fetchSession(): Promise<SessionUser | null> {
  if (!inflight) {
    inflight = api
      .get<SessionUser>('/me')
      .then((r) => {
        cached = r.data;
        return cached;
      })
      .catch(() => {
        cached = null;
        return null;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function useSession() {
  const [user, setUser] = useState<SessionUser | null>(cached);
  const [loading, setLoading] = useState<boolean>(cached === null);

  useEffect(() => {
    let alive = true;
    const notify = (u: SessionUser | null) => {
      if (!alive) return;
      setUser(u);
      setLoading(false);
    };
    subscribers.add(notify);

    if (cached !== null) {
      setLoading(false);
    } else {
      fetchSession().then((u) => {
        for (const fn of subscribers) fn(u);
      });
    }

    return () => {
      alive = false;
      subscribers.delete(notify);
    };
  }, []);

  return { user, loading, isGlobalAdmin: user?.isGlobalAdmin === true };
}
