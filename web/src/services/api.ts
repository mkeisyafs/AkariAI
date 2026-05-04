import axios, { AxiosError } from 'axios';
import type { User, Guild, GuildConfig, ModerationLog, UserWarning } from '../types';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config;

    if (!config || (config as any).__retryCount >= 3) {
      return Promise.reject(error);
    }

    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
      (config as any).__retryCount = ((config as any).__retryCount || 0) + 1;
      const delay = Math.min(1000 * Math.pow(2, (config as any).__retryCount - 1), 5000);

      console.log(`Backend not ready, retrying in ${delay}ms (attempt ${(config as any).__retryCount}/3)`);
      await sleep(delay);

      return api.request(config);
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  getUser: () => api.get<User>('/auth/user'),
  logout: () => api.post('/auth/logout'),
  loginUrl: '/api/auth/discord',
};

export const guildsAPI = {
  getGuilds: () => api.get<Guild[]>('/guilds'),
  getGuild: (guildId: string) => api.get<Guild>(`/guilds/${guildId}`),
  getConfig: (guildId: string) => api.get<GuildConfig>(`/guilds/${guildId}/config`),
  updateConfig: (guildId: string, data: Partial<GuildConfig>) =>
    api.patch<GuildConfig>(`/guilds/${guildId}/config`, data),
};

export const moderationAPI = {
  getLogs: (guildId: string, params?: { limit?: number; skip?: number; action?: string; userId?: string }) =>
    api.get<{ logs: ModerationLog[]; total: number; limit: number; skip: number }>(
      `/moderation/${guildId}/logs`,
      { params }
    ),
  getWarnings: (guildId: string) => api.get<UserWarning[]>(`/moderation/${guildId}/warnings`),
  getUserWarnings: (guildId: string, userId: string) =>
    api.get<UserWarning>(`/moderation/${guildId}/warnings/${userId}`),
};

export default api;
