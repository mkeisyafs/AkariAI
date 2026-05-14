import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSession } from '../../hooks/useSession';
import { LogOut, Shield, Menu, X, LayoutDashboard, Zap } from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  match: (path: string) => boolean;
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const { isGlobalAdmin } = useSession();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  const navItems: NavItem[] = [
    {
      to: '/dashboard',
      label: 'Servers',
      icon: LayoutDashboard,
      match: (p) => p === '/dashboard' || p.startsWith('/guild/'),
    },
  ];

  if (isGlobalAdmin) {
    navItems.push({
      to: '/admin/bots',
      label: 'Bot Registry',
      icon: Shield,
      match: (p) => p.startsWith('/admin/'),
    });
  }

  const avatarUrl = user?.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
    : null;

  return (
    <>
      <header className="sticky top-0 z-40 surface-glass border-b border-line-subtle">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link
              to="/dashboard"
              className="group flex items-center gap-2.5 focus-ring rounded-md"
              aria-label="AkariAI home"
            >
              <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 via-brand-500 to-accent-500 shadow-[0_0_20px_-4px_rgba(122,90,248,0.6)] transition-transform group-hover:scale-105">
                <Zap className="h-4.5 w-4.5 text-white" strokeWidth={2.5} />
                <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/20" />
              </span>
              <div className="flex flex-col leading-none">
                <span className="text-base font-bold tracking-tight text-white">AkariAI</span>
                <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted">
                  Console
                </span>
              </div>
            </Link>

            {user && (
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => {
                  const active = item.match(location.pathname);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      data-testid={item.to === '/admin/bots' ? 'nav-admin-bots' : undefined}
                      className={`relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                        active
                          ? 'text-white'
                          : 'text-ink-secondary hover:text-white hover:bg-surface-3'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                      {active && (
                        <span className="absolute inset-x-2 -bottom-[1px] h-px bg-gradient-to-r from-transparent via-brand-400 to-transparent" />
                      )}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>

          {user && (
            <div className="flex items-center gap-2">
              <div className="relative hidden md:block">
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2.5 rounded-lg border border-line-subtle bg-surface-2 px-2 py-1.5 transition hover:border-line-default hover:bg-surface-3 focus-ring"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={user.username}
                      className="h-7 w-7 rounded-md"
                    />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-brand-500 to-accent-500 text-xs font-semibold text-white">
                      {user.username[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm font-medium text-white max-w-[10rem] truncate">
                    {user.username}
                  </span>
                </button>

                {menuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setMenuOpen(false)}
                      aria-hidden
                    />
                    <div
                      role="menu"
                      className="absolute right-0 z-50 mt-2 w-56 origin-top-right animate-in-up surface-card p-1.5 shadow-[var(--shadow-elevated)]"
                    >
                      <div className="px-3 py-2">
                        <p className="text-xs text-ink-muted">Signed in as</p>
                        <p className="truncate text-sm font-medium text-white">
                          {user.username}
                        </p>
                      </div>
                      <div className="divider !my-1.5" />
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-ink-secondary transition hover:bg-surface-3 hover:text-white"
                        role="menuitem"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="md:hidden flex h-10 w-10 items-center justify-center rounded-lg border border-line-subtle bg-surface-2 text-ink-secondary focus-ring"
                aria-label="Open menu"
                aria-expanded={mobileOpen}
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </header>

      {user && mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 top-0 h-full w-[84%] max-w-sm bg-surface-1 border-l border-line-subtle shadow-[var(--shadow-elevated)] animate-in-up flex flex-col">
            <div className="flex items-center justify-between h-16 px-5 border-b border-line-subtle">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 via-brand-500 to-accent-500">
                  <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
                </span>
                <span className="text-base font-bold text-white">AkariAI</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-3 hover:text-white transition"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center gap-3 px-5 py-5 border-b border-line-subtle">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={user.username}
                  className="h-11 w-11 rounded-lg"
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 text-sm font-semibold text-white">
                  {user.username[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate font-medium text-white">{user.username}</p>
                <p className="text-xs text-ink-muted">Connected via Discord</p>
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              <p className="px-3 pt-2 pb-1 section-title">Navigate</p>
              {navItems.map((item) => {
                const active = item.match(location.pathname);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                      active
                        ? 'bg-brand-600/15 text-white border border-brand-500/30'
                        : 'text-ink-secondary hover:bg-surface-3 hover:text-white border border-transparent'
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-line-subtle p-3">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-secondary transition hover:bg-danger/10 hover:text-red-300"
              >
                <LogOut className="h-4.5 w-4.5" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
