import { Router } from 'express';
import botRelationshipRepository from '../../database/repositories/botRelationshipRepository.js';
import guildBotSettingsRepository from '../../database/repositories/guildBotSettingsRepository.js';
import { requireGuildAdmin } from '../middleware/guildAdmin.js';
import { logger } from '../../utils/logger.js';

const router = Router({ mergeParams: true });
router.use(requireGuildAdmin);

const MAX_RELATIONSHIP_LENGTH = 2000;

function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

router.get('/', async (req, res) => {
  try {
    const { guildId } = req.params;
    const [relationships, settings] = await Promise.all([
      botRelationshipRepository.listForGuild(guildId),
      guildBotSettingsRepository.getForGuild(guildId),
    ]);
    const bots = settings
      .filter((s) => s.bot && s.bot.status === 'ENABLED')
      .map((s) => ({
        id: s.bot.id,
        name: s.bot.name,
        enabledInGuild: s.enabled,
      }));
    return res.json({ bots, relationships });
  } catch (err) {
    logger.error('botRelationships.list.failed', { error: err?.message || String(err) });
    return res.status(500).json({ error: 'Internal error' });
  }
});

router.put('/', async (req, res) => {
  try {
    const { guildId } = req.params;
    const { fromBotId, toBotId, relationship } = req.body || {};
    if (!fromBotId || typeof fromBotId !== 'string') return badRequest(res, 'fromBotId is required');
    if (!toBotId || typeof toBotId !== 'string') return badRequest(res, 'toBotId is required');
    if (fromBotId === toBotId) return badRequest(res, 'fromBotId and toBotId must differ');
    if (
      relationship !== null &&
      relationship !== undefined &&
      typeof relationship !== 'string'
    ) {
      return badRequest(res, 'relationship must be a string or null');
    }
    if (typeof relationship === 'string' && relationship.length > MAX_RELATIONSHIP_LENGTH) {
      return badRequest(res, `relationship is too long (max ${MAX_RELATIONSHIP_LENGTH} chars)`);
    }

    const result = await botRelationshipRepository.upsert(
      guildId,
      fromBotId,
      toBotId,
      relationship ?? null
    );
    return res.json({ ok: true, relationship: result });
  } catch (err) {
    logger.error('botRelationships.upsert.failed', { error: err?.message || String(err) });
    if (err?.message?.startsWith('relationship')) {
      return badRequest(res, err.message);
    }
    return res.status(500).json({ error: 'Internal error' });
  }
});

router.delete('/:fromBotId/:toBotId', async (req, res) => {
  try {
    const { guildId, fromBotId, toBotId } = req.params;
    await botRelationshipRepository.delete(guildId, fromBotId, toBotId);
    return res.json({ ok: true });
  } catch (err) {
    logger.error('botRelationships.delete.failed', { error: err?.message || String(err) });
    return res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
