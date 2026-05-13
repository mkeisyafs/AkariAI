/**
 * Idempotent backfill: single-bot env + GuildConfig → multi-bot tables.
 *
 * Exit contract:
 *   - Fresh install (no DISCORD_TOKEN)        → exit 0, no DB touched.
 *   - Token set, encryption key invalid       → exit 1 (throws from assertKeyValid).
 *   - Token set, CLIENT_ID missing            → exit 1 (Bot.discordAppId is required).
 *   - Already migrated (Bot.isMigrated=true)  → exit 0, no writes.
 *   - Otherwise                               → create Bot, upsert GuildBotSettings for
 *                                               every GuildConfig, populate botId on
 *                                               Knowledge / UserIgnoreList / UserWarning /
 *                                               ModerationLog. All writes in one
 *                                               transaction; partial failure rolls back.
 *
 * Prisma client is imported lazily so DATABASE_URL is not required on the
 * fresh-install / missing-key / missing-client-id paths.
 */
import 'dotenv/config';
import { pathToFileURL } from 'url';
import { assertKeyValid, encrypt } from '../src/utils/encryption.js';

const DEFAULT_PERSONALITY =
  'You are a helpful and friendly Discord bot assistant.';
const LOG_PREFIX = '[backfill-multi-bot]';

function nonEmpty(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

export async function run() {
  // 1. Fresh-install short-circuit. No DB, no encryption key needed.
  if (!nonEmpty(process.env.DISCORD_TOKEN)) {
    console.warn(
      `${LOG_PREFIX} no single-bot env detected, skipping migration — add bots via admin UI`
    );
    return { skipped: true, reason: 'no DISCORD_TOKEN' };
  }

  // 2. Encryption key must be valid before we encrypt anything.
  assertKeyValid();

  // 3. CLIENT_ID is required by the Bot.discordAppId @unique column.
  if (!nonEmpty(process.env.CLIENT_ID)) {
    throw new Error(
      'CLIENT_ID env is required when DISCORD_TOKEN is set (Bot.discordAppId is non-null + unique)'
    );
  }

  // 4. Lazy-import the Prisma client so steps 1–3 do not require DATABASE_URL.
  const { default: prisma } = await import('../src/database/prisma.js');

  try {
    // 5. Idempotency. Look up *outside* the transaction to fail fast.
    const existing = await prisma.bot.findFirst({
      where: { isMigrated: true },
      select: { id: true },
    });
    if (existing) {
      console.log(
        `${LOG_PREFIX} already migrated (botId=${existing.id}), no-op`
      );
      return { skipped: true, reason: 'already migrated', botId: existing.id };
    }

    // 6. Snapshot env values up here so encryption errors fail before any write.
    const encryptedToken = encrypt(process.env.DISCORD_TOKEN);
    const apiKey = process.env.DEFAULT_AI_API_KEY;
    const encryptedApiKey = nonEmpty(apiKey) ? encrypt(apiKey) : null;
    const aiBaseUrl = process.env.DEFAULT_AI_BASE_URL ?? '';
    const aiModel = process.env.DEFAULT_AI_MODEL ?? '';
    const discordAppId = process.env.CLIENT_ID;

    // 7. Single interactive transaction so partial failure rolls back fully.
    const summary = await prisma.$transaction(async (tx) => {
      const bot = await tx.bot.create({
        data: {
          name: 'Legacy Bot',
          discordAppId,
          encryptedToken,
          encryptedApiKey,
          aiBaseUrl,
          aiModel,
          aiPersonality: DEFAULT_PERSONALITY,
          status: 'ENABLED',
          isMigrated: true,
        },
        select: { id: true },
      });

      const guilds = await tx.guildConfig.findMany({
        select: { guildId: true },
      });

      let guildSettingsCreated = 0;
      for (const { guildId } of guilds) {
        await tx.guildBotSettings.upsert({
          where: { guildId_botId: { guildId, botId: bot.id } },
          create: { guildId, botId: bot.id, enabled: true },
          update: {},
        });
        guildSettingsCreated++;
      }

      const [knowledge, ignoreList, warnings, modLogs] = await Promise.all([
        tx.knowledge.updateMany({
          where: { botId: null },
          data: { botId: bot.id },
        }),
        tx.userIgnoreList.updateMany({
          where: { botId: null },
          data: { botId: bot.id },
        }),
        tx.userWarning.updateMany({
          where: { botId: null },
          data: { botId: bot.id },
        }),
        tx.moderationLog.updateMany({
          where: { botId: null },
          data: { botId: bot.id },
        }),
      ]);

      return {
        botId: bot.id,
        guildSettingsCreated,
        knowledgeUpdated: knowledge.count,
        ignoreListUpdated: ignoreList.count,
        warningsUpdated: warnings.count,
        modLogsUpdated: modLogs.count,
      };
    });

    console.log(`${LOG_PREFIX} migration complete: ${JSON.stringify(summary)}`);
    return summary;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

const isCli =
  typeof process.argv[1] === 'string' &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCli) {
  run()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(`${LOG_PREFIX} FAILED: ${err.message}`);
      process.exit(1);
    });
}
