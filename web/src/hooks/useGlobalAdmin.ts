import { useSession } from './useSession';

export function useGlobalAdmin() {
  const { isGlobalAdmin, loading } = useSession();
  return { isGlobalAdmin, loading };
}
