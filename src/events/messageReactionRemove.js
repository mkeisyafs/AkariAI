import reactionRoleRepository from '../database/repositories/reactionRoleRepository.js';

function emojiKey(emoji) {
  return emoji.id || emoji.name;
}

export default {
  name: 'messageReactionRemove',
  async execute(client, botId, reaction, user) {
    if (user.bot) return;

    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error('Error fetching reaction (remove):', error);
        return;
      }
    }

    const guild = reaction.message.guild;
    if (!guild) return;

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

      if (!member.roles.cache.has(role.id)) return;
      await member.roles.remove(role, 'Reaction role removed');
    } catch (error) {
      console.error('reactrole.revoke.failed', {
        botId,
        messageId: reaction.message.id,
        userId: user.id,
        error: error?.message || String(error),
      });
    }
  },
};
