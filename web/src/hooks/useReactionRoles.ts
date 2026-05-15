import { useCallback, useEffect, useState } from 'react';
import {
  reactionRolesApi,
  type AddReactionRoleBindingInput,
  type CreateReactionRoleMessageInput,
} from '../services/reactionRolesApi';
import type {
  ReactionRoleBinding,
  ReactionRoleBotOption,
  ReactionRoleMessage,
} from '../types';

export function useReactionRoles(guildId: string | undefined) {
  const [bots, setBots] = useState<ReactionRoleBotOption[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ReactionRoleMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBots = useCallback(async () => {
    if (!guildId) return;
    setLoading(true);
    setError(null);
    try {
      const list = await reactionRolesApi.listBots(guildId);
      setBots(list);
      setSelectedBotId(prev => {
        if (prev && list.some(b => b.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      setError(err?.response?.data?.error || err?.message || 'Failed to load bots');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const loadMessages = useCallback(async () => {
    if (!guildId || !selectedBotId) {
      setMessages([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await reactionRolesApi.listMessages(guildId, selectedBotId);
      setMessages(list);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      setError(err?.response?.data?.error || err?.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [guildId, selectedBotId]);

  useEffect(() => {
    loadBots();
  }, [loadBots]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const refresh = useCallback(async () => {
    await loadMessages();
  }, [loadMessages]);

  const createMessage = useCallback(
    async (input: CreateReactionRoleMessageInput): Promise<ReactionRoleMessage> => {
      if (!guildId) throw new Error('Missing guildId');
      const created = await reactionRolesApi.createMessage(guildId, input);
      setMessages(prev => [created, ...prev]);
      return created;
    },
    [guildId]
  );

  const deleteMessage = useCallback(
    async (id: string): Promise<void> => {
      if (!guildId || !selectedBotId) return;
      await reactionRolesApi.deleteMessage(guildId, id, selectedBotId);
      setMessages(prev => prev.filter(m => m.id !== id));
    },
    [guildId, selectedBotId]
  );

  const addBinding = useCallback(
    async (id: string, input: AddReactionRoleBindingInput): Promise<ReactionRoleBinding> => {
      if (!guildId) throw new Error('Missing guildId');
      const binding = await reactionRolesApi.addBinding(guildId, id, input);
      setMessages(prev =>
        prev.map(m =>
          m.id === id
            ? { ...m, bindings: [...m.bindings.filter(b => b.emoji !== binding.emoji), binding] }
            : m
        )
      );
      return binding;
    },
    [guildId]
  );

  const removeBinding = useCallback(
    async (id: string, emoji: string): Promise<void> => {
      if (!guildId || !selectedBotId) return;
      setMessages(prev =>
        prev.map(m =>
          m.id === id ? { ...m, bindings: m.bindings.filter(b => b.emoji !== emoji) } : m
        )
      );
      try {
        await reactionRolesApi.removeBinding(guildId, id, emoji, selectedBotId);
      } finally {
        await loadMessages();
      }
    },
    [guildId, selectedBotId, loadMessages]
  );

  return {
    bots,
    selectedBotId,
    setSelectedBotId,
    messages,
    loading,
    error,
    refresh,
    createMessage,
    deleteMessage,
    addBinding,
    removeBinding,
  };
}
