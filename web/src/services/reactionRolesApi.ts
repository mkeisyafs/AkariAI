import api from './api';
import type {
  ReactionRoleBinding,
  ReactionRoleBotOption,
  ReactionRoleMessage,
} from '../types';

export interface CreateReactionRoleMessageInput {
  botId: string;
  channelId: string;
  title: string;
  description: string;
}

export interface AddReactionRoleBindingInput {
  botId: string;
  emoji: string;
  roleId: string;
}

export const reactionRolesApi = {
  listBots: (guildId: string) =>
    api
      .get<{ bots: ReactionRoleBotOption[] }>(`/guilds/${guildId}/reaction-roles/bots`)
      .then(r => r.data.bots),

  listMessages: (guildId: string, botId: string) =>
    api
      .get<{ messages: ReactionRoleMessage[] }>(`/guilds/${guildId}/reaction-roles`, {
        params: { botId },
      })
      .then(r => r.data.messages),

  createMessage: (guildId: string, input: CreateReactionRoleMessageInput) =>
    api
      .post<ReactionRoleMessage>(`/guilds/${guildId}/reaction-roles`, input)
      .then(r => r.data),

  deleteMessage: (guildId: string, id: string, botId: string) =>
    api
      .delete<{ ok: true }>(`/guilds/${guildId}/reaction-roles/${id}`, {
        params: { botId },
      })
      .then(r => r.data),

  addBinding: (guildId: string, id: string, input: AddReactionRoleBindingInput) =>
    api
      .post<ReactionRoleBinding>(
        `/guilds/${guildId}/reaction-roles/${id}/bindings`,
        input
      )
      .then(r => r.data),

  removeBinding: (guildId: string, id: string, emoji: string, botId: string) =>
    api
      .delete<{ ok: true }>(
        `/guilds/${guildId}/reaction-roles/${id}/bindings/${encodeURIComponent(emoji)}`,
        { params: { botId } }
      )
      .then(r => r.data),
};
