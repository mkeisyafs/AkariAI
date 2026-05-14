import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useGuildConfig } from '../hooks/useGuildConfig';
import { guildsAPI } from '../services/api';
import {
  ArrowLeft,
  Sparkles,
  Shield,
  Users,
  CheckCircle,
  BookOpen,
  Lock,
  Terminal,
  Bot,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import AIConfigForm from '../components/config/AIConfigForm';
import ModerationConfigForm from '../components/config/ModerationConfigForm';
import WelcomeConfigForm from '../components/config/WelcomeConfigForm';
import VerificationConfigForm from '../components/config/VerificationConfigForm';
import KnowledgeConfigForm from '../components/config/KnowledgeConfigForm';
import WhitelistConfigForm from '../components/config/WhitelistConfigForm';
import CommandsConfigForm from '../components/config/CommandsConfigForm';
import GuildBotsConfigForm from '../components/config/GuildBotsConfigForm';
import type { Guild } from '../types';

type Tab =
  | 'ai'
  | 'bots'
  | 'moderation'
  | 'welcome'
  | 'verification'
  | 'knowledge'
  | 'whitelist'
  | 'commands';

interface TabDef {
  id: Tab;
  name: string;
  shortName: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TABS: TabDef[] = [
  {
    id: 'ai',
    name: 'AI Configuration',
    shortName: 'AI',
    description: 'Endpoint, model, personality, and response behavior.',
    icon: Sparkles,
  },
  {
    id: 'bots',
    name: 'Bots',
    shortName: 'Bots',
    description: 'Bind one or more bots to this server.',
    icon: Bot,
  },
  {
    id: 'moderation',
    name: 'Moderation',
    shortName: 'Mod',
    description: 'Toxicity, banned words, warning escalation.',
    icon: Shield,
  },
  {
    id: 'welcome',
    name: 'Welcome System',
    shortName: 'Welcome',
    description: 'Greet new members and set goodbye flow.',
    icon: Users,
  },
  {
    id: 'verification',
    name: 'Verification',
    shortName: 'Verify',
    description: 'Button-based verification with role assignment.',
    icon: CheckCircle,
  },
  {
    id: 'knowledge',
    name: 'Knowledge Base',
    shortName: 'Knowledge',
    description: 'Custom facts your bot can recall in chat.',
    icon: BookOpen,
  },
  {
    id: 'commands',
    name: 'Commands',
    shortName: 'Commands',
    description: 'Enable, disable, and sync slash commands.',
    icon: Terminal,
  },
  {
    id: 'whitelist',
    name: 'Access Control',
    shortName: 'Access',
    description: 'Restrict bot interactions to specific users or roles.',
    icon: Lock,
  },
];

export default function GuildConfig() {
  const { guildId } = useParams<{ guildId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { config, loading, updateConfig } = useGuildConfig(guildId || null);
  const [activeTab, setActiveTab] = useState<Tab>('ai');
  const [guild, setGuild] = useState<Guild | null>(null);
  const [fetchingGuild, setFetchingGuild] = useState(false);

  useEffect(() => {
    if (!guildId || !user) return;

    const foundGuild = user.guilds?.find((g) => g.id === guildId);
    if (foundGuild) {
      setGuild(foundGuild);
      return;
    }
    const fetchGuild = async () => {
      try {
        setFetchingGuild(true);
        const response = await guildsAPI.getGuild(guildId);
        setGuild(response.data);
      } catch (error) {
        console.error('Failed to fetch guild:', error);
      } finally {
        setFetchingGuild(false);
      }
    };
    fetchGuild();
  }, [guildId, user]);

  if (fetchingGuild || !guild) {
    return <PageLoader label="Loading server…" />;
  }

  if (!config) {
    return <PageLoader label="Loading configuration…" />;
  }

  const activeDef = TABS.find((t) => t.id === activeTab) ?? TABS[0];

  return (
    <div className="space-y-6 animate-fade">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-line-default bg-surface-2 text-ink-secondary transition hover:bg-surface-3 hover:text-white focus-ring"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>

          {guild.icon ? (
            <img
              src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
              alt={guild.name}
              className="h-12 w-12 flex-shrink-0 rounded-xl ring-1 ring-line-default"
            />
          ) : (
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-lg font-bold text-white">
              {guild.name[0]?.toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="section-title">Configuration</p>
            <h1 className="mt-0.5 text-xl md:text-2xl font-bold text-white tracking-tight truncate">
              {guild.name}
            </h1>
          </div>
        </div>

        <nav
          className="flex items-center gap-1.5 text-xs text-ink-muted"
          aria-label="Breadcrumb"
        >
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="hover:text-ink-secondary transition"
          >
            Servers
          </button>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-ink-secondary truncate max-w-[8rem] md:max-w-none">
            {guild.name}
          </span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-white">{activeDef.shortName}</span>
        </nav>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5 md:gap-6">
        <aside className="hidden lg:block">
          <nav className="surface-panel p-2 sticky top-20" aria-label="Sections">
            <p className="px-3 pt-2 pb-1.5 section-title">Sections</p>
            <div className="space-y-0.5">
              {TABS.map((tab) => {
                const active = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`group relative flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition ${
                      active
                        ? 'bg-brand-600/15 text-white'
                        : 'text-ink-secondary hover:bg-surface-3 hover:text-white'
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-brand-400" />
                    )}
                    <Icon
                      className={`h-4 w-4 ${
                        active ? 'text-brand-300' : 'text-ink-muted group-hover:text-white'
                      }`}
                    />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </aside>

        <div className="space-y-4">
          <div className="lg:hidden">
            <label htmlFor="section-select" className="sr-only">
              Section
            </label>
            <select
              id="section-select"
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as Tab)}
              className="select"
            >
              {TABS.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.name}
                </option>
              ))}
            </select>
            <div className="mt-2 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 no-scrollbar">
              {TABS.map((tab) => {
                const active = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      active
                        ? 'border-brand-500/40 bg-brand-600/15 text-white'
                        : 'border-line-default bg-surface-2 text-ink-secondary'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.shortName}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="surface-panel">
            <div className="flex items-start gap-3 border-b border-line-subtle px-4 py-4 md:px-6 md:py-5">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500/20 to-accent-500/20 ring-1 ring-line-default">
                <activeDef.icon className="h-4.5 w-4.5 text-brand-300" />
              </span>
              <div className="min-w-0">
                <h2 className="text-base md:text-lg font-semibold text-white">
                  {activeDef.name}
                </h2>
                <p className="mt-0.5 text-xs md:text-sm text-ink-secondary">
                  {activeDef.description}
                </p>
              </div>
            </div>

            <div className="p-4 md:p-6 animate-in-up">
              {activeTab === 'ai' && (
                <AIConfigForm config={config} onSave={updateConfig} loading={loading} />
              )}
              {activeTab === 'bots' && guildId && <GuildBotsConfigForm guildId={guildId} />}
              {activeTab === 'moderation' && (
                <ModerationConfigForm config={config} onSave={updateConfig} loading={loading} />
              )}
              {activeTab === 'welcome' && (
                <WelcomeConfigForm
                  config={config}
                  onSave={updateConfig}
                  loading={loading}
                  guildId={guildId || ''}
                />
              )}
              {activeTab === 'verification' && (
                <VerificationConfigForm
                  config={config}
                  onSave={updateConfig}
                  loading={loading}
                  guildId={guildId || ''}
                />
              )}
              {activeTab === 'knowledge' && guildId && (
                <KnowledgeConfigForm guildId={guildId} />
              )}
              {activeTab === 'commands' && guildId && (
                <CommandsConfigForm
                  config={config}
                  onSave={updateConfig}
                  loading={loading}
                  guildId={guildId}
                />
              )}
              {activeTab === 'whitelist' && (
                <WhitelistConfigForm config={config} onSave={updateConfig} loading={loading} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PageLoader({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex items-center gap-3 text-ink-secondary">
        <Loader2 className="h-5 w-5 animate-spin text-brand-400" />
        <span className="text-sm">{label}</span>
      </div>
    </div>
  );
}
