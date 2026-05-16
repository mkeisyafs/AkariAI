-- AlterTable
ALTER TABLE "GuildBotSettings"
    ADD COLUMN "aiBaseUrlOverride"        TEXT,
    ADD COLUMN "aiModelOverride"          TEXT,
    ADD COLUMN "aiMaxTokensOverride"      INTEGER,
    ADD COLUMN "aiContextMessagesOverride" INTEGER,
    ADD COLUMN "encryptedApiKeyOverride"  TEXT;
