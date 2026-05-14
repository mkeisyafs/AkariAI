import type { ReactNode } from 'react';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { useSession } from '../../hooks/useSession';

export default function RequireGlobalAdmin({ children }: { children: ReactNode }) {
  const { isGlobalAdmin, loading } = useSession();

  if (loading) {
    return (
      <div
        className="flex items-center justify-center py-20"
        data-testid="require-admin-loading"
      >
        <div className="flex items-center gap-3 text-ink-secondary">
          <Loader2 className="h-5 w-5 animate-spin text-brand-400" />
          <span className="text-sm">Verifying access…</span>
        </div>
      </div>
    );
  }

  if (!isGlobalAdmin) {
    return (
      <div
        className="surface-card mx-auto max-w-lg text-center py-14 px-6"
        data-testid="not-authorized"
      >
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30">
          <ShieldAlert className="h-7 w-7 text-amber-300" />
        </div>
        <h1 className="mt-5 text-xl font-semibold text-white">Not authorized</h1>
        <p className="mt-2 text-sm text-ink-secondary">
          This area is restricted to global administrators.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
