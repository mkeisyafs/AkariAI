import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Registers every event module under src/events/*.js on the given client.
// Event modules export `{ name, once?, async execute(client, botId, ...args) }`
// — this loader injects `client` and `botId` so handlers are multi-bot aware
// without knowing about the registry.
//
// Per-handler exceptions are caught here so one misbehaving event file does
// not poison subsequent handlers for the same tick.
export async function registerEventsForClient(client, botId) {
  if (!client) {
    throw new Error('registerEventsForClient: client is required');
  }
  if (!botId) {
    throw new Error('registerEventsForClient: botId is required');
  }

  const eventsPath = join(__dirname, '../events');
  const eventFiles = readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

  for (const file of eventFiles) {
    const filePath = join(eventsPath, file);
    const mod = await import(`file://${filePath}`);
    const event = mod.default;

    if (!event || typeof event.execute !== 'function' || !event.name) {
      console.warn(`⚠️  Event at ${filePath} is missing required "name" or "execute"`);
      continue;
    }

    const wrapper = async (...args) => {
      try {
        await event.execute(client, botId, ...args);
      } catch (err) {
        console.error(
          JSON.stringify({
            ts: new Date().toISOString(),
            event: 'event.handler.error',
            botId,
            name: event.name,
            error: err && err.message ? err.message : String(err),
          })
        );
      }
    };

    if (event.once) {
      client.once(event.name, wrapper);
    } else {
      client.on(event.name, wrapper);
    }
  }
}

// Legacy shim — preserves the pre-multi-bot `loadEvents(client)` entrypoint so
// src/index.js (not yet rewritten by T18) keeps booting. Uses a sentinel botId
// matching the commandHandler's legacy key so interactionCreate resolves
// commands via `getBotCommands("_default_legacy")`.
export async function loadEvents(client) {
  return registerEventsForClient(client, '_default_legacy');
}
