import { getGuildConfig } from '../../utils/configManager.js';

export async function checkGuildWhitelist(guildId, user, userGuilds) {
  const botOwnerId = process.env.BOT_OWNER_ID;

  if (botOwnerId && user.id === botOwnerId) {
    return { allowed: true };
  }

  const config = await getGuildConfig(guildId);

  if (!config.whitelistEnabled) {
    return { allowed: true };
  }

  const userGuild = userGuilds.find(g => g.id === guildId);
  if (!userGuild) {
    return { allowed: false, reason: 'You are not a member of this server' };
  }

  if (config.whitelistUserIds.includes(user.id)) {
    return { allowed: true };
  }

  const hasWhitelistedRole = userGuild.roles?.some(roleId =>
    config.whitelistRoleIds.includes(roleId)
  );

  if (hasWhitelistedRole) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: 'You are not whitelisted to access this server\'s dashboard'
  };
}
