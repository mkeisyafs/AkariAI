import api from './api';
import type { GuildBotEntry, GuildBotSettings } from '../types';

export const guildBotsApi = {
  list: (guildId: string) =>
    api.get<GuildBotEntry[]>(`/guilds/${guildId}/bots`).then(r => r.data),
  update: (guildId: string, botId: string, patch: Partial<GuildBotSettings>) =>
    api
      .put<GuildBotSettings>(`/guilds/${guildId}/bots/${botId}`, patch)
      .then(r => r.data),
  redeployCommands: (guildId: string, botId: string) =>
    api
      .post<{ status: string; count?: number }>(
        `/guilds/${guildId}/bots/${botId}/deploy-commands`
      )
      .then(r => r.data),
};
