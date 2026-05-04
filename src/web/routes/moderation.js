import { Router } from 'express';
import { requireAuth, requireGuildAccess, requireWhitelist } from '../middleware/auth.js';
import moderationLogRepository from '../../database/repositories/moderationLogRepository.js';
import userWarningRepository from '../../database/repositories/userWarningRepository.js';

const router = Router();

router.get('/:guildId/logs', requireAuth, requireWhitelist, requireGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { limit = 50, skip = 0, action, userId } = req.query;

    const options = {
      limit: parseInt(limit),
      skip: parseInt(skip),
      orderBy: { timestamp: 'desc' },
    };

    let logs;
    let total;

    if (action) {
      logs = await moderationLogRepository.findByAction(guildId, action, options);
      total = await moderationLogRepository.countByGuildId(guildId);
    } else if (userId) {
      logs = await moderationLogRepository.findByUserId(guildId, userId, options);
      total = await moderationLogRepository.countByUserId(guildId, userId);
    } else {
      logs = await moderationLogRepository.findByGuildId(guildId, options);
      total = await moderationLogRepository.countByGuildId(guildId);
    }

    res.json({
      logs,
      total,
      limit: options.limit,
      skip: options.skip,
    });
  } catch (error) {
    console.error('Error fetching moderation logs:', error);
    res.status(500).json({ error: 'Failed to fetch moderation logs' });
  }
});

router.get('/:guildId/warnings', requireAuth, requireWhitelist, requireGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    const warnings = await userWarningRepository.getAllWarningsForGuild(guildId);

    res.json(warnings);
  } catch (error) {
    console.error('Error fetching warnings:', error);
    res.status(500).json({ error: 'Failed to fetch warnings' });
  }
});

router.get('/:guildId/warnings/:userId', requireAuth, requireWhitelist, requireGuildAccess, async (req, res) => {
  try {
    const { guildId, userId } = req.params;
    const warnings = await userWarningRepository.findByGuildAndUser(guildId, userId);

    if (!warnings) {
      return res.json({ userId, warnings: [] });
    }

    res.json(warnings);
  } catch (error) {
    console.error('Error fetching user warnings:', error);
    res.status(500).json({ error: 'Failed to fetch user warnings' });
  }
});

export default router;
