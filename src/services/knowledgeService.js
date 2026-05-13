import prisma from '../database/prisma.js';

export class KnowledgeService {
  async addKnowledge(guildId, botId, key, value, category = 'general', description = null, createdBy) {
    try {
      const knowledge = await prisma.knowledge.create({
        data: {
          guildId,
          botId,
          key: key.toLowerCase(),
          value,
          category,
          description,
          createdBy,
        },
      });
      return { success: true, knowledge };
    } catch (error) {
      if (error.code === 'P2002') {
        return { success: false, error: 'A knowledge entry with this key already exists.' };
      }
      console.error('Error adding knowledge:', error);
      return { success: false, error: 'Failed to add knowledge entry.' };
    }
  }

  async getKnowledge(guildId, botId, key) {
    try {
      const knowledge = await prisma.knowledge.findUnique({
        where: {
          guildId_botId_key: {
            guildId,
            botId,
            key: key.toLowerCase(),
          },
        },
      });
      return knowledge;
    } catch (error) {
      console.error('Error getting knowledge:', error);
      return null;
    }
  }

  async getAllKnowledge(guildId, botId, category = null) {
    try {
      const where = { guildId, botId };
      if (category) {
        where.category = category;
      }

      const knowledge = await prisma.knowledge.findMany({
        where,
        orderBy: { key: 'asc' },
      });
      return knowledge;
    } catch (error) {
      console.error('Error getting all knowledge:', error);
      return [];
    }
  }

  async updateKnowledge(guildId, botId, key, updates) {
    try {
      const knowledge = await prisma.knowledge.update({
        where: {
          guildId_botId_key: {
            guildId,
            botId,
            key: key.toLowerCase(),
          },
        },
        data: updates,
      });
      return { success: true, knowledge };
    } catch (error) {
      if (error.code === 'P2025') {
        return { success: false, error: 'Knowledge entry not found.' };
      }
      console.error('Error updating knowledge:', error);
      return { success: false, error: 'Failed to update knowledge entry.' };
    }
  }

  async deleteKnowledge(guildId, botId, key) {
    try {
      await prisma.knowledge.delete({
        where: {
          guildId_botId_key: {
            guildId,
            botId,
            key: key.toLowerCase(),
          },
        },
      });
      return { success: true };
    } catch (error) {
      if (error.code === 'P2025') {
        return { success: false, error: 'Knowledge entry not found.' };
      }
      console.error('Error deleting knowledge:', error);
      return { success: false, error: 'Failed to delete knowledge entry.' };
    }
  }

  async searchKnowledge(guildId, botId, searchTerm) {
    try {
      const knowledge = await prisma.knowledge.findMany({
        where: {
          guildId,
          botId,
          OR: [
            { key: { contains: searchTerm.toLowerCase() } },
            { value: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        orderBy: { key: 'asc' },
      });
      return knowledge;
    } catch (error) {
      console.error('Error searching knowledge:', error);
      return [];
    }
  }

  async getCategories(guildId, botId) {
    try {
      const categories = await prisma.knowledge.findMany({
        where: { guildId, botId },
        select: { category: true },
        distinct: ['category'],
        orderBy: { category: 'asc' },
      });
      return categories.map(c => c.category);
    } catch (error) {
      console.error('Error getting categories:', error);
      return [];
    }
  }

  buildKnowledgeContext(knowledgeEntries) {
    if (!knowledgeEntries || knowledgeEntries.length === 0) {
      return '';
    }

    const contextParts = ['Here is relevant knowledge you should use when responding:'];

    const byCategory = {};
    knowledgeEntries.forEach(entry => {
      if (!byCategory[entry.category]) {
        byCategory[entry.category] = [];
      }
      byCategory[entry.category].push(entry);
    });

    Object.entries(byCategory).forEach(([category, entries]) => {
      contextParts.push(`\n[${category.toUpperCase()}]`);
      entries.forEach(entry => {
        contextParts.push(`- ${entry.key}: ${entry.value}`);
      });
    });

    return contextParts.join('\n');
  }
}

export const knowledgeService = new KnowledgeService();
