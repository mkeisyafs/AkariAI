import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { guildsAPI } from '../services/api';
import {
  Server,
  Search,
  Crown,
  ChevronRight,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import type { Guild } from '../types';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const fetchGuilds = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await guildsAPI.getGuilds();
        setGuilds(response.data);
      } catch (err: unknown) {
        const e = err as { response?: { data?: { message?: string } } };
        console.error('Error fetching guilds:', err);
        setError(e?.response?.data?.message || 'Failed to load servers');
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchGuilds();
  }, [user]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return guilds;
    return guilds.filter((g) => g.name.toLowerCase().includes(q));
  }, [guilds, query]);

  const ownedCount = useMemo(() => guilds.filter((g) => g.owner).length, [guilds]);

  const handleGuildSelect = (guildId: string) => {
    navigate(`/guild/${guildId}`);
  };

  if (!user) return null;

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 animate-in-up">
        <div>
          <p className="section-title">Workspace</p>
          <h1 className="mt-1 text-2xl md:text-3xl font-bold text-white tracking-tight">
            Welcome back, <span className="text-gradient">{user.username}</span>
          </h1>
          <p className="mt-1.5 text-sm md:text-base text-ink-secondary">
            Choose a server to configure its bot, moderation, and access controls.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <StatChip
            label="Servers"
            value={loading ? '—' : guilds.length}
            icon={<Server className="h-3.5 w-3.5" />}
          />
          <StatChip
            label="Owned"
            value={loading ? '—' : ownedCount}
            icon={<Crown className="h-3.5 w-3.5" />}
            accent
          />
        </div>
      </header>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your servers…"
          className="input pl-9"
          aria-label="Search servers"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} />
      ) : guilds.length === 0 ? (
        <EmptyState />
      ) : filtered.length === 0 ? (
        <NoResults query={query} onClear={() => setQuery('')} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 animate-fade">
          {filtered.map((guild, i) => (
            <GuildCard
              key={guild.id}
              guild={guild}
              onSelect={handleGuildSelect}
              delayMs={i * 30}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GuildCard({
  guild,
  onSelect,
  delayMs,
}: {
  guild: Guild;
  onSelect: (id: string) => void;
  delayMs: number;
}) {
  const initial = guild.name?.[0]?.toUpperCase() ?? 'S';
  return (
    <button
      type="button"
      onClick={() => onSelect(guild.id)}
      className="group relative surface-card p-4 md:p-5 text-left transition hover:border-brand-500/50 hover:-translate-y-0.5 focus-ring animate-in-up"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/50 to-transparent opacity-0 transition group-hover:opacity-100"
      />
      <div className="flex items-center gap-3 md:gap-4">
        {guild.icon ? (
          <img
            src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
            alt={guild.name}
            className="h-12 w-12 md:h-14 md:w-14 rounded-xl ring-1 ring-line-default flex-shrink-0 object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 md:h-14 md:w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-base md:text-lg font-bold text-white shadow-inner">
            {initial}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate group-hover:text-brand-300 transition">
            {guild.name}
          </h3>
          <div className="mt-1 flex items-center gap-1.5">
            {guild.owner ? (
              <span className="badge badge-warn">
                <Crown className="h-3 w-3" />
                Owner
              </span>
            ) : (
              <span className="badge badge-neutral">Admin</span>
            )}
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-ink-muted transition group-hover:translate-x-0.5 group-hover:text-brand-300 flex-shrink-0" />
      </div>
    </button>
  );
}

function SkeletonCard() {
  return (
    <div className="surface-panel p-4 md:p-5 animate-pulse">
      <div className="flex items-center gap-3 md:gap-4">
        <div className="h-12 w-12 md:h-14 md:w-14 rounded-xl bg-surface-3" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-3/5 rounded bg-surface-3" />
          <div className="h-2.5 w-1/3 rounded bg-surface-3" />
        </div>
      </div>
    </div>
  );
}

function StatChip({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
        accent
          ? 'border-brand-500/30 bg-brand-600/10 text-brand-200'
          : 'border-line-default bg-surface-2 text-ink-secondary'
      }`}
    >
      <span className={accent ? 'text-brand-300' : 'text-ink-muted'}>{icon}</span>
      <span className="text-xs font-medium">{label}</span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="surface-card text-center py-14 px-6 animate-fade">
      <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/20 to-accent-500/20 border border-line-default">
        <Sparkles className="h-7 w-7 text-brand-300" />
      </div>
      <h3 className="mt-5 text-lg font-semibold text-white">No servers to manage yet</h3>
      <p className="mt-2 text-sm text-ink-secondary max-w-sm mx-auto">
        You need administrator permissions in a server to configure it here. Invite the bot or
        ask an owner for access.
      </p>
    </div>
  );
}

function NoResults({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div className="surface-card text-center py-12 px-6 animate-fade">
      <Search className="mx-auto h-8 w-8 text-ink-muted" />
      <h3 className="mt-4 text-base font-semibold text-white">
        No servers match "{query}"
      </h3>
      <button type="button" onClick={onClear} className="btn btn-ghost btn-sm mt-3">
        Clear search
      </button>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="surface-card text-center py-14 px-6 border-red-500/30">
      <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/30">
        <ShieldAlert className="h-7 w-7 text-red-300" />
      </div>
      <h3 className="mt-5 text-lg font-semibold text-red-300">Couldn't load servers</h3>
      <p className="mt-2 text-sm text-ink-secondary">{message}</p>
    </div>
  );
}
