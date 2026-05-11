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
