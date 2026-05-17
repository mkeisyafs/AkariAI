const TICKET_TTL_MS = 60_000;

const tickets = new Map();

function key(guildId, channelId, listenerBotId) {
  return `${guildId}:${channelId}:${listenerBotId}`;
}

export function issueForcedReplyTicket(guildId, channelId, listenerBotId, expectedSpeakerBotId) {
  if (!guildId || !channelId || !listenerBotId || !expectedSpeakerBotId) {
    throw new Error('issueForcedReplyTicket: all four arguments are required');
  }
  const k = key(guildId, channelId, listenerBotId);
  tickets.set(k, {
    expectedSpeakerBotId,
    expiresAt: Date.now() + TICKET_TTL_MS,
  });
}

export function consumeForcedReplyTicket(guildId, channelId, listenerBotId, actualSpeakerBotId) {
  const k = key(guildId, channelId, listenerBotId);
  const t = tickets.get(k);
  if (!t) return false;
  if (t.expiresAt < Date.now()) {
    tickets.delete(k);
    return false;
  }
  if (t.expectedSpeakerBotId !== actualSpeakerBotId) return false;
  tickets.delete(k);
  return true;
}

export function clearAllForcedReplyTickets() {
  tickets.clear();
}
