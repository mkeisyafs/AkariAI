export interface User {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  guilds: Guild[];
}

export interface Guild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
}

export interface GuildConfig {
  id: string;
  guildId: string;
  aiEnabled: boolean;
  aiBaseUrl: string;
  aiModel: string;
  aiApiKey: string;
  aiPersonality: string;
  aiResponseChance: number;
  aiCooldown: number;
  aiAllowedChannels: string[];
  aiMaxTokens: number;
  aiContextMessages: number;
  aiReplyOnlyMode: boolean;
  moderationEnabled: boolean;
  moderationToxicityThreshold: number;
  moderationAutoWarn: boolean;
  moderationAutoMute: boolean;
  moderationAutoKick: boolean;
  moderationAutoBan: boolean;
  moderationLogChannelId: string | null;
  moderationBannedWords: string[];
  moderationWarnPunishments: { warns: number; action: string; duration: number }[];
  verificationEnabled: boolean;
  verificationRoleId: string | null;
  verificationChannelId: string | null;
  verificationMethod: string;
  verificationMessage: string;
  verificationEmoji: string;
  verificationButtonText: string;
  verificationAlreadyVerifiedMessage: string;
  welcomeEnabled: boolean;
  welcomeChannelId: string | null;
  welcomeMessage: string;
  welcomeUseEmbed: boolean;
  autoRoleEnabled: boolean;
  autoRoleIds: string[];
  goodbyeEnabled: boolean;
  goodbyeChannelId: string | null;
  goodbyeMessage: string;
  goodbyeUseEmbed: boolean;
  whitelistEnabled: boolean;
  whitelistUserIds: string[];
  whitelistRoleIds: string[];
  disabledCommands: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ModerationLog {
  id: string;
  guildId: string;
  userId: string;
  moderatorId: string;
  action: string;
  reason: string;
  duration: number | null;
  timestamp: string;
}

export interface UserWarning {
  id: string;
  guildId: string;
  userId: string;
  warnings: Warning[];
}

export interface Warning {
  id: string;
  moderatorId: string;
  reason: string;
  timestamp: string;
  userWarningId: string;
}

// ─── Multi-Bot System (T25) ────────────────────────────────────────────────

export type BotStatus = 'DISABLED' | 'ENABLED' | 'TOKEN_INVALID' | 'UNHEALTHY';

export interface Bot {
  id: string;
  name: string;
  discordAppId: string;
  discordBotUserId: string | null;
  aiBaseUrl: string;
  aiModel: string;
  aiPersonality: string;
  aiMaxTokens: number;
  aiContextMessages: number;
  status: BotStatus;
  isMigrated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBotInput {
  name: string;
  discordAppId: string;
  token: string;
  aiBaseUrl?: string;
  aiModel?: string;
  aiApiKey?: string;
  aiPersonality?: string;
  aiMaxTokens?: number;
  aiContextMessages?: number;
}

export interface UpdateBotInput {
  name?: string;
  aiBaseUrl?: string;
  aiModel?: string;
  aiPersonality?: string;
  aiMaxTokens?: number;
  aiContextMessages?: number;
}

export interface GuildBotSettings {
  id: string;
  guildId: string;
  botId: string;
  enabled: boolean;
  personalityOverride: string | null;
  aiBaseUrlOverride: string | null;
  aiModelOverride: string | null;
  aiMaxTokensOverride: number | null;
  aiContextMessagesOverride: number | null;
  hasApiKeyOverride: boolean;
  responseChance: number | null;
  cooldownMs: number | null;
  replyOnlyMode: boolean | null;
  allowedChannels: string[];
  botToBotEnabled: boolean;
  maxChainDepth: number;
  channelCooldownMs: number;
  circuitBreakerCount: number;
  circuitBreakerWindowMs: number;
  circuitBreakerPauseMs: number;
  mentionBypassMatrix: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GuildBotEntry {
  bot: Pick<Bot, 'id' | 'name' | 'discordAppId' | 'discordBotUserId' | 'status'>;
  settings: GuildBotSettings | null;
  presentInGuild: boolean;
}

// PairMatrix: { [speakerBotId]: { [targetBotId]: chance 0–100 } }
export type PairMatrix = Record<string, Record<string, number>>;

// ─── Reaction Roles ────────────────────────────────────────────────────────

export interface ReactionRoleBinding {
  id: string;
  messageId: string;
  emoji: string;
  roleId: string;
  createdAt: string;
}

export interface ReactionRoleMessage {
  id: string;
  botId: string;
  guildId: string;
  channelId: string;
  messageId: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  bindings: ReactionRoleBinding[];
}

export interface ReactionRoleBotOption {
  id: string;
  name: string;
  discordAppId: string;
  discordBotUserId: string | null;
}

// ─── Bot Lore (relationships) ──────────────────────────────────────────────

export interface BotRelationship {
  id: string;
  guildId: string;
  fromBotId: string;
  toBotId: string;
  relationship: string;
  createdAt: string;
  updatedAt: string;
}

export interface BotLoreBot {
  id: string;
  name: string;
  enabledInGuild: boolean;
}

export interface BotRelationshipsResponse {
  bots: BotLoreBot[];
  relationships: BotRelationship[];
}
