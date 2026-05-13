import api from './api';
import type { Bot, CreateBotInput, UpdateBotInput } from '../types';

export const adminBotsApi = {
  list: () => api.get<Bot[]>('/admin/bots').then(r => r.data),
  create: (input: CreateBotInput) =>
    api.post<Bot>('/admin/bots', input).then(r => r.data),
  update: (id: string, patch: UpdateBotInput) =>
    api.put<Bot>(`/admin/bots/${id}`, patch).then(r => r.data),
  rotateToken: (id: string, newToken: string) =>
    api
      .put<{ ok: boolean; status: string }>(`/admin/bots/${id}/token`, { newToken })
      .then(r => r.data),
  rotateApiKey: (id: string, newApiKey: string) =>
    api.put<void>(`/admin/bots/${id}/api-key`, { newApiKey }).then(r => r.data),
  remove: (id: string) => api.delete<void>(`/admin/bots/${id}`).then(r => r.data),
  restart: (id: string) =>
    api
      .post<{ ok: boolean; status: string }>(`/admin/bots/${id}/restart`)
      .then(r => r.data),
};
