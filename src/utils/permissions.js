import { PermissionFlagsBits } from 'discord.js';

export function hasAdminPermission(member) {
  return member.permissions.has(PermissionFlagsBits.Administrator);
}

export function hasModeratorPermission(member) {
  return member.permissions.has(PermissionFlagsBits.ModerateMembers) ||
         member.permissions.has(PermissionFlagsBits.KickMembers) ||
         member.permissions.has(PermissionFlagsBits.BanMembers);
}

export function isAuthorizedUser(userId) {
  const ownerId = process.env.BOT_OWNER_ID;
  const whitelist = process.env.WHITELIST_USER_IDS?.split(',').map(id => id.trim()).filter(Boolean) || [];

  if (ownerId && userId === ownerId) {
    return true;
  }

  return whitelist.includes(userId);
}

export function isAuthorizedUsername(username) {
  const whitelist = process.env.WHITELIST_USERNAMES?.split(',').map(name => name.trim().toLowerCase()).filter(Boolean) || [];

  return whitelist.includes(username.toLowerCase());
}

export function isAuthorized(user) {
  return isAuthorizedUser(user.id) || isAuthorizedUsername(user.username);
}
