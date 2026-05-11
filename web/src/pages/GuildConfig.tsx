import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useGuildConfig } from '../hooks/useGuildConfig';
import { guildsAPI } from '../services/api';
import { ArrowLeft, Sparkles, Shield, Users, CheckCircle, BookOpen, Lock, Terminal } from 'lucide-react';
import AIConfigForm from '../components/config/AIConfigForm';
import ModerationConfigForm from '../components/config/ModerationConfigForm';
import WelcomeConfigForm from '../components/config/WelcomeConfigForm';
import VerificationConfigForm from '../components/config/VerificationConfigForm';
import KnowledgeConfigForm from '../components/config/KnowledgeConfigForm';
import WhitelistConfigForm from '../components/config/WhitelistConfigForm';
import CommandsConfigForm from '../components/config/CommandsConfigForm';
import type { Guild } from '../types';

type Tab = 'ai' | 'moderation' | 'welcome' | 'verification' | 'knowledge' | 'whitelist' | 'commands';

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
    } else {
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
    }
  }, [guildId, user]);

  if (fetchingGuild || !guild) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Loading guild...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Loading configuration...</p>
      </div>
    );
  }

  const tabs = [
    { id: 'ai' as Tab, name: 'AI Configuration', icon: Sparkles, shortName: 'AI' },
    { id: 'moderation' as Tab, name: 'Moderation', icon: Shield, shortName: 'Moderation' },
    { id: 'welcome' as Tab, name: 'Welcome System', icon: Users, shortName: 'Welcome' },
    { id: 'verification' as Tab, name: 'Verification', icon: CheckCircle, shortName: 'Verify' },
    { id: 'knowledge' as Tab, name: 'Knowledge Base', icon: BookOpen, shortName: 'Knowledge' },
    { id: 'commands' as Tab, name: 'Commands', icon: Terminal, shortName: 'Commands' },
    { id: 'whitelist' as Tab, name: 'Access Control', icon: Lock, shortName: 'Access' },
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center space-x-3 md:space-x-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 hover:bg-discord-gray rounded-lg transition"
        >
          <ArrowLeft className="h-5 w-5 text-gray-400" />
        </button>
        <div className="flex items-center space-x-2 md:space-x-3">
          {guild.icon ? (
            <img
              src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
              alt={guild.name}
              className="h-10 w-10 md:h-12 md:w-12 rounded-full"
            />
          ) : (
            <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-discord-blurple flex items-center justify-center text-white font-bold text-lg md:text-xl">
              {guild.name[0]}
            </div>
          )}
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">{guild.name}</h1>
            <p className="text-xs md:text-sm text-gray-400">Server Configuration</p>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-700 overflow-x-auto">
        <nav className="flex space-x-4 md:space-x-8 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-1.5 md:space-x-2 py-3 md:py-4 px-1 border-b-2 font-medium text-xs md:text-sm transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-discord-blurple text-discord-blurple'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 md:h-5 md:w-5" />
                <span className="md:hidden">{tab.shortName}</span>
                <span className="hidden md:inline">{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="bg-discord-gray rounded-lg p-4 md:p-6 border border-gray-700">
        {activeTab === 'ai' && (
          <AIConfigForm config={config} onSave={updateConfig} loading={loading} />
        )}
        {activeTab === 'moderation' && (
          <ModerationConfigForm config={config} onSave={updateConfig} loading={loading} />
        )}
        {activeTab === 'welcome' && (
          <WelcomeConfigForm config={config} onSave={updateConfig} loading={loading} guildId={guildId || ''} />
        )}
        {activeTab === 'verification' && (
          <VerificationConfigForm config={config} onSave={updateConfig} loading={loading} guildId={guildId || ''} />
        )}
        {activeTab === 'knowledge' && guildId && (
          <KnowledgeConfigForm guildId={guildId} />
        )}
        {activeTab === 'commands' && guildId && (
          <CommandsConfigForm config={config} onSave={updateConfig} loading={loading} guildId={guildId} />
        )}
        {activeTab === 'whitelist' && (
          <WhitelistConfigForm config={config} onSave={updateConfig} loading={loading} />
        )}
      </div>
    </div>
  );
}
