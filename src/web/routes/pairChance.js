import { Router } from 'express';
import botRepository from '../../database/repositories/botRepository.js';
import botPairChanceRepository from '../../database/repositories/botPairChanceRepository.js';
import { requireGuildAdmin } from '../middleware/guildAdmin.js';

const router = Router({ mergeParams: true });

router.use(requireGuildAdmin);

router.get('/', async (req, res) => {
  try {
    const { guildId } = req.params;
    const matrix = await botPairChanceRepository.getMatrix(guildId);
    return res.json(matrix);
  } catch (err) {
    console.error('GET pair-chance failed:', err.message);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// PUT body shape: { [speakerBotId]: { [targetBotId]: chance, ... }, ... }
// All ids must be known bots; self-pairs (speaker === target) and out-of-range
// chances (non-int or outside 0-100) are rejected with 400 BEFORE any DB write,
// so the request is all-or-nothing — we never half-apply on validation failure.
router.put('/', async (req, res) => {
  try {
    const { guildId } = req.params;
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ error: 'Body must be an object' });
    }

    const allBots = await botRepository.listBots({ includeDisabled: true });
    const knownIds = new Set(allBots.map((b) => b.id));

    const updates = [];
    for (const speakerId of Object.keys(body)) {
      if (!knownIds.has(speakerId)) {
        return res.status(400).json({ error: `Unknown speakerBotId: ${speakerId}` });
      }
      const targets = body[speakerId];
      if (!targets || typeof targets !== 'object' || Array.isArray(targets)) {
        return res.status(400).json({ error: `Targets must be an object for ${speakerId}` });
      }
      for (const targetId of Object.keys(targets)) {
        if (!knownIds.has(targetId)) {
          return res.status(400).json({ error: `Unknown targetBotId: ${targetId}` });
        }
        if (speakerId === targetId) {
          return res.status(400).json({ error: `Self-pair not allowed: ${speakerId}` });
        }
        const raw = targets[targetId];
        const chance = Number(raw);
        if (!Number.isInteger(chance) || chance < 0 || chance > 100) {
          return res.status(400).json({
            error: `Invalid chance for ${speakerId}->${targetId}: must be integer 0-100`,
          });
        }
        updates.push({ speakerId, targetId, chance });
      }
    }

    for (const u of updates) {
      await botPairChanceRepository.setPair(guildId, u.speakerId, u.targetId, u.chance);
    }

    const matrix = await botPairChanceRepository.getMatrix(guildId);
    return res.json(matrix);
  } catch (err) {
    console.error('PUT pair-chance failed:', err.message);
    return res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
