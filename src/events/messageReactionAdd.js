import { getGuildConfig } from '../utils/configManager.js';
import reactionRoleRepository from '../database/repositories/reactionRoleRepository.js';

function emojiKey(emoji) {
  return emoji.id || emoji.name;
}

async function handleVerification(reaction, user) {
  const guild = reaction.message.guild;
  const config = await getGuildConfig(guild.id);

  if (!config.verificationEnabled || config.verificationMethod !== 'reaction') return false;
  if (!config.verificationRoleId || !config.verificationChannelId) return false;
  if (reaction.message.channel.id !== config.verificationChannelId) return false;

  const key = emojiKey(reaction.emoji);
  const configEmoji = config.verificationEmoji;
  if (key !== configEmoji && reaction.emoji.name !== configEmoji) return false;

  try {
    const member = await guild.members.fetch(user.id);
    const role = guild.roles.cache.get(config.verificationRoleId);
    if (!role) {
      console.error('Verification role not found');
      return true;
    }
    if (member.roles.cache.has(role.id)) return true;
    await member.roles.add(role);
    try {
      await user.send(`✅ You have been verified in **${guild.name}**! Welcome to the server.`);
    } catch {
      void 0;
    }
  } catch (error) {
    console.error('Error handling verification reaction:', error);
  }
  return true;
}

async function handleReactionRoleGrant(botId, reaction, user) {
  const guild = reaction.message.guild;
  const key = emojiKey(reaction.emoji);

  const binding = await reactionRoleRepository.findBindingForReaction(
    botId,
    reaction.message.id,
    key
  );
  if (!binding) return;
  if (binding.guildId !== guild.id) return;

  try {
    const member = await guild.members.fetch(user.id);
    const role = guild.roles.cache.get(binding.roleId) || (await guild.roles.fetch(binding.roleId));
    if (!role) return;

    const me = await guild.members.fetchMe();
    if (role.managed) return;
    if (me.roles.highest.comparePositionTo(role) <= 0) return;

    if (member.roles.cache.has(role.id)) return;
    await member.roles.add(role, 'Reaction role grant');
  } catch (error) {
    console.error('reactrole.grant.failed', {
      botId,
      messageId: reaction.message.id,
      userId: user.id,
      error: error?.message || String(error),
    });
  }
}

export default {
  name: 'messageReactionAdd',
  async execute(client, botId, reaction, user) {
    if (user.bot) return;

    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error('Error fetching reaction:', error);
        return;
      }
    }

    const guild = reaction.message.guild;
    if (!guild) return;

    const handled = await handleVerification(reaction, user);
    if (handled) return;

    await handleReactionRoleGrant(botId, reaction, user);
  },
};
