-- AlterTable
ALTER TABLE "GuildBotSettings"
    ALTER COLUMN "maxChainDepth" SET DEFAULT 10,
    ALTER COLUMN "channelCooldownMs" SET DEFAULT 1500;
