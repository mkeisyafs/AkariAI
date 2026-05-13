-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "GuildConfig" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
    "aiBaseUrl" TEXT NOT NULL DEFAULT '',
    "aiModel" TEXT NOT NULL DEFAULT '',
    "aiApiKey" TEXT NOT NULL DEFAULT '',
    "aiPersonality" TEXT NOT NULL DEFAULT 'You are a helpful and friendly Discord bot assistant.',
    "aiResponseChance" INTEGER NOT NULL DEFAULT 100,
    "aiCooldown" INTEGER NOT NULL DEFAULT 3000,
    "aiAllowedChannels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aiMaxTokens" INTEGER NOT NULL DEFAULT 1000,
    "aiContextMessages" INTEGER NOT NULL DEFAULT 10,
    "aiReplyOnlyMode" BOOLEAN NOT NULL DEFAULT false,
    "moderationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "moderationToxicityThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "moderationAutoWarn" BOOLEAN NOT NULL DEFAULT true,
    "moderationAutoMute" BOOLEAN NOT NULL DEFAULT false,
    "moderationAutoKick" BOOLEAN NOT NULL DEFAULT false,
    "moderationAutoBan" BOOLEAN NOT NULL DEFAULT false,
    "moderationLogChannelId" TEXT,
    "moderationBannedWords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "moderationWarnPunishments" JSONB NOT NULL DEFAULT '[]',
    "verificationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "verificationRoleId" TEXT,
    "verificationChannelId" TEXT,
    "verificationMethod" TEXT NOT NULL DEFAULT 'button',
    "verificationMessage" TEXT NOT NULL DEFAULT 'Welcome! Click the button below to verify and gain access to the server.',
    "verificationEmoji" TEXT NOT NULL DEFAULT '✅',
    "verificationButtonText" TEXT NOT NULL DEFAULT 'Verify',
    "verificationAlreadyVerifiedMessage" TEXT NOT NULL DEFAULT '✅ You are already verified!',
    "welcomeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "welcomeChannelId" TEXT,
    "welcomeMessage" TEXT NOT NULL DEFAULT 'Welcome {user} to {server}!',
    "welcomeUseEmbed" BOOLEAN NOT NULL DEFAULT true,
    "autoRoleEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoRoleIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "goodbyeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "goodbyeChannelId" TEXT,
    "goodbyeMessage" TEXT NOT NULL DEFAULT 'Goodbye {user}, we''ll miss you!',
    "goodbyeUseEmbed" BOOLEAN NOT NULL DEFAULT true,
    "whitelistEnabled" BOOLEAN NOT NULL DEFAULT false,
    "whitelistUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "whitelistRoleIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "disabledCommands" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationLog" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT 'No reason provided',
    "duration" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserWarning" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "UserWarning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warning" (
    "id" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userWarningId" TEXT NOT NULL,

    CONSTRAINT "Warning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Knowledge" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "description" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Knowledge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationHistory" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserIgnoreList" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ignored" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserIgnoreList_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuildConfig_guildId_key" ON "GuildConfig"("guildId");

-- CreateIndex
CREATE INDEX "GuildConfig_guildId_idx" ON "GuildConfig"("guildId");

-- CreateIndex
CREATE INDEX "ModerationLog_guildId_idx" ON "ModerationLog"("guildId");

-- CreateIndex
CREATE INDEX "ModerationLog_userId_idx" ON "ModerationLog"("userId");

-- CreateIndex
CREATE INDEX "ModerationLog_timestamp_idx" ON "ModerationLog"("timestamp");

-- CreateIndex
CREATE INDEX "UserWarning_guildId_idx" ON "UserWarning"("guildId");

-- CreateIndex
CREATE INDEX "UserWarning_userId_idx" ON "UserWarning"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserWarning_guildId_userId_key" ON "UserWarning"("guildId", "userId");

-- CreateIndex
CREATE INDEX "Warning_userWarningId_idx" ON "Warning"("userWarningId");

-- CreateIndex
CREATE INDEX "Knowledge_guildId_idx" ON "Knowledge"("guildId");

-- CreateIndex
CREATE INDEX "Knowledge_category_idx" ON "Knowledge"("category");

-- CreateIndex
CREATE UNIQUE INDEX "Knowledge_guildId_key_key" ON "Knowledge"("guildId", "key");

-- CreateIndex
CREATE INDEX "ConversationHistory_guildId_channelId_timestamp_idx" ON "ConversationHistory"("guildId", "channelId", "timestamp");

-- CreateIndex
CREATE INDEX "ConversationHistory_channelId_idx" ON "ConversationHistory"("channelId");

-- CreateIndex
CREATE INDEX "UserIgnoreList_guildId_idx" ON "UserIgnoreList"("guildId");

-- CreateIndex
CREATE INDEX "UserIgnoreList_userId_idx" ON "UserIgnoreList"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserIgnoreList_guildId_userId_key" ON "UserIgnoreList"("guildId", "userId");

-- AddForeignKey
ALTER TABLE "ModerationLog" ADD CONSTRAINT "ModerationLog_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "GuildConfig"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWarning" ADD CONSTRAINT "UserWarning_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "GuildConfig"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warning" ADD CONSTRAINT "Warning_userWarningId_fkey" FOREIGN KEY ("userWarningId") REFERENCES "UserWarning"("id") ON DELETE CASCADE ON UPDATE CASCADE;

