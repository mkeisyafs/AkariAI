import api from './api';
import type { PairMatrix } from '../types';

export const pairChanceApi = {
  get: (guildId: string) =>
    api.get<PairMatrix>(`/guilds/${guildId}/pair-chance`).then(r => r.data),
  put: (guildId: string, matrix: PairMatrix) =>
    api.put<PairMatrix>(`/guilds/${guildId}/pair-chance`, matrix).then(r => r.data),
};
