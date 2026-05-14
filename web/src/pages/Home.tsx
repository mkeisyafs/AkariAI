import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authAPI } from '../services/api';
import {
  Sparkles,
  ShieldCheck,
  UserCheck,
  MessageSquareHeart,
  Zap,
  ArrowRight,
  BookOpen,
  Lock,
  Terminal,
  Bot,
} from 'lucide-react';

const features = [
  {
    icon: Sparkles,
    title: 'Conversational AI',
    body: 'Plug in OpenAI, Claude, or any compatible endpoint. Tune personality, response rate, and context window per server.',
    accent: 'from-brand-400 to-brand-600',
  },
  {
    icon: ShieldCheck,
    title: 'Moderation',
    body: 'Toxicity detection, banned-word filters, warning escalation, and log channels — fully automated.',
    accent: 'from-emerald-400 to-emerald-600',
  },
  {
    icon: UserCheck,
    title: 'Verification',
    body: 'Button-based gating with custom roles, messages, and reactions. Keep raiders out, members in.',
    accent: 'from-sky-400 to-blue-600',
  },
  {
    icon: MessageSquareHeart,
    title: 'Welcome & Goodbye',
    body: 'Rich embeds, dynamic variables, auto-role assignment, and goodbye flows — configured in seconds.',
    accent: 'from-pink-400 to-accent-600',
  },
  {
    icon: BookOpen,
    title: 'Knowledge Base',
    body: 'Teach each bot facts about your community. Keys, categories, and descriptions your bot can recall in chat.',
    accent: 'from-amber-400 to-orange-600',
  },
  {
    icon: Terminal,
    title: 'Command Control',
    body: 'Enable, disable, and sync slash commands with one click. Global and per-guild control without the CLI.',
    accent: 'from-violet-400 to-violet-600',
  },
  {
    icon: Lock,
    title: 'Access Control',
    body: 'Whitelist specific users or roles. Lock sensitive commands to the right crowd without custom code.',
    accent: 'from-rose-400 to-rose-600',
  },
  {
    icon: Bot,
    title: 'Multi-Bot Registry',
    body: 'Run multiple Discord bots from one dashboard. Hot-swap tokens, restart instances, rotate keys safely.',
    accent: 'from-cyan-400 to-teal-600',
  },
];

const stats = [
  { value: 'AES-256', label: 'Token encryption at rest' },
  { value: '100%', label: 'Self-host, own your data' },
  { value: '<1s', label: 'Config hot-reload' },
];

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

export default function Home() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-ink-secondary">
          <span className="h-2 w-2 rounded-full bg-brand-400 animate-pulse" />
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-grid mask-fade-y opacity-50"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[1100px] max-w-[140vw] rounded-full"
        style={{
          background:
            'radial-gradient(closest-side, rgba(122,90,248,0.35), rgba(236,72,153,0.15) 45%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 py-5">
        <Link to="/" className="flex items-center gap-2.5 focus-ring rounded-md">
          <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 via-brand-500 to-accent-500 shadow-[0_0_20px_-4px_rgba(122,90,248,0.6)]">
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

        <a
          href={authAPI.loginUrl}
          className="btn btn-secondary btn-sm hidden sm:inline-flex"
        >
          <DiscordIcon className="h-4 w-4" />
          Sign in
        </a>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 md:pt-16 pb-16 md:pb-24 animate-fade">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-line-default bg-surface-2/60 px-3 py-1 backdrop-blur">
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-400">
              <span className="absolute inset-0 rounded-full bg-brand-400 animate-ping opacity-60" />
            </span>
            <span className="text-xs font-medium text-ink-secondary">
              The Discord AI control plane
            </span>
          </div>

          <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
            <span className="text-gradient">Run your Discord bots</span>
            <br />
            <span className="text-white">without the chaos.</span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-base md:text-lg text-ink-secondary leading-relaxed">
            One console for AI chat, moderation, verification, welcomes, knowledge, and
            multi-bot orchestration. Configure once, deploy everywhere.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={authAPI.loginUrl}
              className="btn btn-primary btn-lg w-full sm:w-auto group"
            >
              <DiscordIcon className="h-5 w-5" />
              Continue with Discord
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="#features"
              className="btn btn-ghost btn-lg w-full sm:w-auto text-ink-secondary"
            >
              Explore features
            </a>
          </div>

          <p className="mt-5 text-xs text-ink-muted">
            OAuth-only · Never stores your Discord password · Bot tokens encrypted end-to-end
          </p>
        </div>

        <div className="mt-14 md:mt-20 grid grid-cols-3 gap-3 md:gap-6 mx-auto max-w-2xl">
          {stats.map((s) => (
            <div
              key={s.label}
              className="surface-panel px-3 py-4 md:px-5 md:py-5 text-center"
            >
              <div className="text-xl md:text-2xl font-bold text-gradient">{s.value}</div>
              <div className="mt-1 text-[11px] md:text-xs text-ink-muted leading-snug">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        id="features"
        className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20 md:pb-28"
      >
        <div className="max-w-2xl">
          <p className="section-title">Capabilities</p>
          <h2 className="mt-2 text-2xl md:text-3xl font-bold text-white tracking-tight">
            Everything you need. Nothing you don't.
          </h2>
          <p className="mt-3 text-sm md:text-base text-ink-secondary">
            A pragmatic toolkit for operators who want to ship fast without giving up control.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="surface-card relative p-5 transition hover:border-line-strong hover:-translate-y-0.5"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${f.accent} shadow-inner`}
                >
                  <Icon className="h-5 w-5 text-white" strokeWidth={2} />
                </div>
                <h3 className="mt-4 text-base font-semibold text-white">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">{f.body}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-14 md:mt-20 surface-card relative overflow-hidden px-6 py-10 md:px-10 md:py-14 text-center">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background:
                'radial-gradient(600px 200px at 50% 0%, rgba(122,90,248,0.3), transparent 70%)',
            }}
          />
          <div className="relative">
            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Ready to take control?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm md:text-base text-ink-secondary">
              Sign in with Discord. Pick a server. Configure your bot. That's it.
            </p>
            <a
              href={authAPI.loginUrl}
              className="btn btn-primary btn-lg mt-6 inline-flex"
            >
              <DiscordIcon className="h-5 w-5" />
              Get started
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-line-subtle">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 py-6 text-xs text-ink-muted">
          <p>© {new Date().getFullYear()} AkariAI · Built for Discord communities</p>
          <p className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            All systems operational
          </p>
        </div>
      </footer>
    </div>
  );
}
