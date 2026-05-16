-- CreateTable
CREATE TABLE "BotRelationship" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "fromBotId" TEXT NOT NULL,
    "toBotId" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BotRelationship_guildId_fromBotId_toBotId_key" ON "BotRelationship"("guildId", "fromBotId", "toBotId");

-- CreateIndex
CREATE INDEX "BotRelationship_guildId_fromBotId_idx" ON "BotRelationship"("guildId", "fromBotId");

-- CreateIndex
CREATE INDEX "BotRelationship_guildId_idx" ON "BotRelationship"("guildId");
