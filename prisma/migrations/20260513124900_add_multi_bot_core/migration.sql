-- DropIndex
DROP INDEX "Knowledge_guildId_key_key";

-- DropIndex
DROP INDEX "UserIgnoreList_guildId_userId_key";

-- AlterTable
ALTER TABLE "ModerationLog" ADD COLUMN     "botId" TEXT;

-- AlterTable
ALTER TABLE "UserWarning" ADD COLUMN     "botId" TEXT;

-- AlterTable
ALTER TABLE "Knowledge" ADD COLUMN     "botId" TEXT;

-- AlterTable
ALTER TABLE "UserIgnoreList" ADD COLUMN     "botId" TEXT;

-- CreateTable
CREATE TABLE "Bot" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "discordAppId" TEXT NOT NULL,
    "discordBotUserId" TEXT,
    "encryptedToken" TEXT NOT NULL,
    "encryptedApiKey" TEXT,
    "aiBaseUrl" TEXT NOT NULL DEFAULT '',
    "aiModel" TEXT NOT NULL DEFAULT '',
    "aiPersonality" TEXT NOT NULL DEFAULT 'You are a helpful and friendly Discord bot assistant.',
    "aiMaxTokens" INTEGER NOT NULL DEFAULT 1000,
    "aiContextMessages" INTEGER NOT NULL DEFAULT 10,
    "status" TEXT NOT NULL DEFAULT 'DISABLED',
    "isMigrated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildBotSettings" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "personalityOverride" TEXT,
    "responseChance" INTEGER,
    "cooldownMs" INTEGER,
    "replyOnlyMode" BOOLEAN,
    "allowedChannels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "botToBotEnabled" BOOLEAN NOT NULL DEFAULT false,
    "maxChainDepth" INTEGER NOT NULL DEFAULT 3,
    "channelCooldownMs" INTEGER NOT NULL DEFAULT 5000,
    "circuitBreakerCount" INTEGER NOT NULL DEFAULT 10,
    "circuitBreakerWindowMs" INTEGER NOT NULL DEFAULT 60000,
    "circuitBreakerPauseMs" INTEGER NOT NULL DEFAULT 300000,
    "mentionBypassMatrix" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildBotSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotPairChance" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "speakerBotId" TEXT NOT NULL,
    "targetBotId" TEXT NOT NULL,
    "chance" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotPairChance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Bot_discordAppId_key" ON "Bot"("discordAppId");

-- CreateIndex
CREATE UNIQUE INDEX "Bot_discordBotUserId_key" ON "Bot"("discordBotUserId");

-- CreateIndex
CREATE INDEX "Bot_status_idx" ON "Bot"("status");

-- CreateIndex
CREATE INDEX "GuildBotSettings_guildId_idx" ON "GuildBotSettings"("guildId");

-- CreateIndex
CREATE INDEX "GuildBotSettings_botId_idx" ON "GuildBotSettings"("botId");

-- CreateIndex
CREATE UNIQUE INDEX "GuildBotSettings_guildId_botId_key" ON "GuildBotSettings"("guildId", "botId");

-- CreateIndex
CREATE INDEX "BotPairChance_guildId_idx" ON "BotPairChance"("guildId");

-- CreateIndex
CREATE INDEX "BotPairChance_speakerBotId_idx" ON "BotPairChance"("speakerBotId");

-- CreateIndex
CREATE UNIQUE INDEX "BotPairChance_guildId_speakerBotId_targetBotId_key" ON "BotPairChance"("guildId", "speakerBotId", "targetBotId");

-- CreateIndex
CREATE INDEX "ModerationLog_botId_idx" ON "ModerationLog"("botId");

-- CreateIndex
CREATE INDEX "UserWarning_botId_idx" ON "UserWarning"("botId");

-- CreateIndex
CREATE INDEX "Knowledge_botId_idx" ON "Knowledge"("botId");

-- CreateIndex
CREATE UNIQUE INDEX "Knowledge_guildId_botId_key_key" ON "Knowledge"("guildId", "botId", "key");

-- CreateIndex
CREATE INDEX "UserIgnoreList_botId_idx" ON "UserIgnoreList"("botId");

-- CreateIndex
CREATE UNIQUE INDEX "UserIgnoreList_guildId_botId_userId_key" ON "UserIgnoreList"("guildId", "botId", "userId");

-- AddForeignKey
ALTER TABLE "GuildBotSettings" ADD CONSTRAINT "GuildBotSettings_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

