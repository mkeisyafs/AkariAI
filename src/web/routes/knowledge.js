import { Router } from 'express';
import { requireAuth, requireGuildAccess, requireWhitelist } from '../middleware/auth.js';
import { knowledgeService } from '../../services/knowledgeService.js';

const router = Router();

router.get('/:guildId/knowledge', requireAuth, requireWhitelist, requireGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { category, search } = req.query;

    let knowledge;
    if (search) {
      knowledge = await knowledgeService.searchKnowledge(guildId, search);
    } else if (category) {
      knowledge = await knowledgeService.getAllKnowledge(guildId, category);
    } else {
      knowledge = await knowledgeService.getAllKnowledge(guildId);
    }

    res.json(knowledge);
  } catch (error) {
    console.error('Error fetching knowledge:', error);
    res.status(500).json({ error: 'Failed to fetch knowledge entries' });
  }
});

router.get('/:guildId/knowledge/categories', requireAuth, requireWhitelist, requireGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    const categories = await knowledgeService.getCategories(guildId);
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.get('/:guildId/knowledge/:key', requireAuth, requireWhitelist, requireGuildAccess, async (req, res) => {
  try {
    const { guildId, key } = req.params;
    const knowledge = await knowledgeService.getKnowledge(guildId, key);

    if (!knowledge) {
      return res.status(404).json({ error: 'Knowledge entry not found' });
    }

    res.json(knowledge);
  } catch (error) {
    console.error('Error fetching knowledge entry:', error);
    res.status(500).json({ error: 'Failed to fetch knowledge entry' });
  }
});

router.post('/:guildId/knowledge', requireAuth, requireWhitelist, requireGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { key, value, category, description } = req.body;

    if (!key || !value) {
      return res.status(400).json({ error: 'Key and value are required' });
    }

    const result = await knowledgeService.addKnowledge(
      guildId,
      key,
      value,
      category || 'general',
      description,
      req.user.id
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.status(201).json(result.knowledge);
  } catch (error) {
    console.error('Error creating knowledge entry:', error);
    res.status(500).json({ error: 'Failed to create knowledge entry' });
  }
});

router.patch('/:guildId/knowledge/:key', requireAuth, requireWhitelist, requireGuildAccess, async (req, res) => {
  try {
    const { guildId, key } = req.params;
    const { value, category, description } = req.body;

    const updates = {};
    if (value !== undefined) updates.value = value;
    if (category !== undefined) updates.category = category;
    if (description !== undefined) updates.description = description;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    const result = await knowledgeService.updateKnowledge(guildId, key, updates);

    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }

    res.json(result.knowledge);
  } catch (error) {
    console.error('Error updating knowledge entry:', error);
    res.status(500).json({ error: 'Failed to update knowledge entry' });
  }
});

router.delete('/:guildId/knowledge/:key', requireAuth, requireWhitelist, requireGuildAccess, async (req, res) => {
  try {
    const { guildId, key } = req.params;
    const result = await knowledgeService.deleteKnowledge(guildId, key);

    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting knowledge entry:', error);
    res.status(500).json({ error: 'Failed to delete knowledge entry' });
  }
});

export default router;
