import { config } from 'dotenv';
import { assertKeyValid } from './utils/encryption.js';
import { connectDatabase, disconnectDatabase } from './database/connection.js';
import botRepository from './database/repositories/botRepository.js';
import { loadCommandsForDeploy } from './handlers/commandHandler.js';
import { deployAllBotsToTheirGuilds } from './services/slashCommandDeployer.js';

config();

async function main() {
  assertKeyValid();
  await connectDatabase();

  const bots = await botRepository.listBots({ includeDisabled: false });
  const enabled = bots.filter((b) => b.status === 'ENABLED');

  for (const bot of enabled) {
    await loadCommandsForDeploy(bot.id);
  }

  console.log(
    `Deploying slash commands for ${enabled.length} enabled bot(s) to their enabled guilds...`
  );

  const summary = await deployAllBotsToTheirGuilds();

  console.log(
    `✅ Deploy complete — deployed=${summary.deployed} failed=${summary.failed} ` +
      `skipped=${summary.skipped} total=${summary.total}`
  );

  if (summary.failed > 0) {
    for (const r of summary.results) {
      if (r.status === 'failed') {
        console.error(`  ✗ bot=${r.botId} guild=${r.guildId} error=${r.error}`);
      }
    }
  }

  await disconnectDatabase();
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error('Error deploying commands:', err && err.message ? err.message : err);
  try {
    await disconnectDatabase();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
