import prisma from '../prisma.js';

function normalizeEmoji(input) {
  if (!input || typeof input !== 'string') {
    throw new Error('emoji must be a non-empty string');
  }
  return input.trim();
}

export class ReactionRoleRepository {
  async listMessagesForGuild(botId, guildId) {
    return prisma.reactionRoleMessage.findMany({
      where: { botId, guildId },
      include: { bindings: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMessageByDiscordId(botId, messageId) {
    return prisma.reactionRoleMessage.findUnique({
      where: { botId_messageId: { botId, messageId } },
      include: { bindings: true },
    });
  }

  async createMessage({
    botId,
    guildId,
    channelId,
    messageId,
    title = '',
    description = '',
  }) {
    if (!botId || !guildId || !channelId || !messageId) {
      throw new Error('botId, guildId, channelId, messageId are required');
    }
    return prisma.reactionRoleMessage.create({
      data: { botId, guildId, channelId, messageId, title, description },
      include: { bindings: true },
    });
  }

  async deleteMessage(id) {
    return prisma.reactionRoleMessage.delete({ where: { id } });
  }

  async addBinding(reactionRoleMessageId, emoji, roleId) {
    if (!reactionRoleMessageId) throw new Error('reactionRoleMessageId is required');
    if (!roleId) throw new Error('roleId is required');
    const normalized = normalizeEmoji(emoji);
    return prisma.reactionRoleBinding.upsert({
      where: { messageId_emoji: { messageId: reactionRoleMessageId, emoji: normalized } },
      update: { roleId },
      create: { messageId: reactionRoleMessageId, emoji: normalized, roleId },
    });
  }

  async removeBinding(reactionRoleMessageId, emoji) {
    const normalized = normalizeEmoji(emoji);
    try {
      return await prisma.reactionRoleBinding.delete({
        where: { messageId_emoji: { messageId: reactionRoleMessageId, emoji: normalized } },
      });
    } catch (err) {
      if (err && err.code === 'P2025') return null;
      throw err;
    }
  }

  async findBindingForReaction(botId, discordMessageId, emoji) {
    const message = await prisma.reactionRoleMessage.findUnique({
      where: { botId_messageId: { botId, messageId: discordMessageId } },
      select: { id: true, guildId: true },
    });
    if (!message) return null;
    const normalized = normalizeEmoji(emoji);
    const binding = await prisma.reactionRoleBinding.findUnique({
      where: { messageId_emoji: { messageId: message.id, emoji: normalized } },
      select: { roleId: true },
    });
    if (!binding) return null;
    return { roleId: binding.roleId, guildId: message.guildId };
  }
}

export default new ReactionRoleRepository();
