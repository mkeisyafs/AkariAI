-- CreateTable
CREATE TABLE "ReactionRoleMessage" (
    "id" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReactionRoleMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReactionRoleBinding" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReactionRoleBinding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReactionRoleMessage_botId_messageId_key" ON "ReactionRoleMessage"("botId", "messageId");

-- CreateIndex
CREATE INDEX "ReactionRoleMessage_botId_guildId_idx" ON "ReactionRoleMessage"("botId", "guildId");

-- CreateIndex
CREATE INDEX "ReactionRoleMessage_guildId_idx" ON "ReactionRoleMessage"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "ReactionRoleBinding_messageId_emoji_key" ON "ReactionRoleBinding"("messageId", "emoji");

-- CreateIndex
CREATE INDEX "ReactionRoleBinding_messageId_idx" ON "ReactionRoleBinding"("messageId");

-- AddForeignKey
ALTER TABLE "ReactionRoleBinding" ADD CONSTRAINT "ReactionRoleBinding_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ReactionRoleMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
