import api from './api';
import type { BotRelationship, BotRelationshipsResponse } from '../types';

export const botRelationshipsApi = {
  get: (guildId: string) =>
    api
      .get<BotRelationshipsResponse>(`/guilds/${guildId}/bot-relationships`)
      .then(r => r.data),

  upsert: (guildId: string, fromBotId: string, toBotId: string, relationship: string | null) =>
    api
      .put<{ ok: true; relationship: BotRelationship | null }>(
        `/guilds/${guildId}/bot-relationships`,
        { fromBotId, toBotId, relationship }
      )
      .then(r => r.data),

  delete: (guildId: string, fromBotId: string, toBotId: string) =>
    api
      .delete<{ ok: true }>(
        `/guilds/${guildId}/bot-relationships/${fromBotId}/${toBotId}`
      )
      .then(r => r.data),
};
