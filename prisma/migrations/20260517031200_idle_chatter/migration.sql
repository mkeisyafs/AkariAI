-- CreateTable
CREATE TABLE "IdleChatterConfig" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "idleMinutes" INTEGER NOT NULL DEFAULT 30,
    "maxPerHour" INTEGER NOT NULL DEFAULT 2,
    "topicHint" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdleChatterConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IdleChatterConfig_guildId_botId_channelId_key" ON "IdleChatterConfig"("guildId", "botId", "channelId");

-- CreateIndex
CREATE INDEX "IdleChatterConfig_guildId_channelId_idx" ON "IdleChatterConfig"("guildId", "channelId");

-- CreateIndex
CREATE INDEX "IdleChatterConfig_botId_idx" ON "IdleChatterConfig"("botId");
