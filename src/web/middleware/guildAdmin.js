import { PermissionsBitField } from 'discord.js';
import botManager from '../../services/botManager.js';

// requireGuildAdmin — verifies the authenticated user has ManageGuild or
// Administrator permission in the target guild by checking membership through
// any READY bot client present in that guild.
//
// Rationale: we deliberately avoid Discord REST /users/@me/guilds here (slower,
// rate-limited, session-dependent). Any of our bots that are in the guild can
// resolve member permissions cheaply via discord.js guild members cache/fetch.
//
// Failure modes:
//   401 — unauthenticated
//   400 — missing/invalid guildId
//   403 — user is not a guild admin, OR we have no bot present in the guild
//         to verify against. 403 is preferred over 412 here so the client-side
//         treatment is uniform with other auth failures; the message hints at
//         the "no bot present" case for debuggability.
const SNOWFLAKE_RE = /^[0-9]{15,20}$/;

export async function requireGuildAdmin(req, res, next) {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const guildId = req.params.guildId || req.body?.guildId;
  if (!guildId || !SNOWFLAKE_RE.test(guildId)) {
    return res.status(400).json({ error: 'Invalid or missing guildId' });
  }

  const handles = botManager.getAllHandles();
  let anyBotPresent = false;
  for (const h of handles) {
    if (h.status !== 'READY') continue;
    const client = botManager.getClient(h.botId);
    const guild = client?.guilds?.cache?.get(guildId);
    if (!guild) continue;
    anyBotPresent = true;
    try {
      const member = await guild.members.fetch(req.user.id);
      if (
        member.permissions.has(PermissionsBitField.Flags.ManageGuild) ||
        member.permissions.has(PermissionsBitField.Flags.Administrator)
      ) {
        req.guild = guild;
        return next();
      }
    } catch {
      // user not in this guild (per this bot's view) — try next bot
    }
  }

  if (!anyBotPresent) {
    return res.status(403).json({
      error: 'No bot present in guild',
      hint: 'Invite a bot to this guild before managing it from the dashboard.',
    });
  }
  return res.status(403).json({ error: 'Not a guild admin' });
}

export default requireGuildAdmin;
