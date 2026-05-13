import type { ReactNode } from 'react';
import { useSession } from '../../hooks/useSession';

export default function RequireGlobalAdmin({ children }: { children: ReactNode }) {
  const { isGlobalAdmin, loading } = useSession();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16" data-testid="require-admin-loading">
        <div className="text-gray-400">Loading…</div>
      </div>
    );
  }

  if (!isGlobalAdmin) {
    return (
      <div
        className="p-8 max-w-2xl mx-auto text-center"
        data-testid="not-authorized"
      >
        <h1 className="text-2xl font-semibold text-white">Not authorized</h1>
        <p className="mt-2 text-gray-400">
          This page is restricted to global administrators.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
