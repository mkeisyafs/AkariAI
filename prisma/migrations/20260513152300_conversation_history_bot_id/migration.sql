-- AlterTable
ALTER TABLE "ConversationHistory" ADD COLUMN     "botId" TEXT;

-- CreateIndex
CREATE INDEX "ConversationHistory_botId_channelId_timestamp_idx" ON "ConversationHistory"("botId", "channelId", "timestamp");
