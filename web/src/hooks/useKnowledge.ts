import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Knowledge {
  id: string;
  guildId: string;
  key: string;
  value: string;
  category: string;
  description: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export function useKnowledge(guildId: string | null) {
  const [knowledge, setKnowledge] = useState<Knowledge[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKnowledge = async (category?: string, search?: string) => {
    if (!guildId) return;

    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (search) params.append('search', search);

      const response = await axios.get(
        `${API_URL}/api/guilds/${guildId}/knowledge?${params.toString()}`,
        { withCredentials: true }
      );
      setKnowledge(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch knowledge');
      console.error('Error fetching knowledge:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    if (!guildId) return;

    try {
      const response = await axios.get(
        `${API_URL}/api/guilds/${guildId}/knowledge/categories`,
        { withCredentials: true }
      );
      setCategories(response.data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const addKnowledge = async (
    key: string,
    value: string,
    category: string,
    description?: string
  ) => {
    if (!guildId) return;

    try {
      const response = await axios.post(
        `${API_URL}/api/guilds/${guildId}/knowledge`,
        { key, value, category, description },
        { withCredentials: true }
      );
      await fetchKnowledge();
      await fetchCategories();
      return { success: true, data: response.data };
    } catch (err: any) {
      return {
        success: false,
        error: err.response?.data?.error || 'Failed to add knowledge',
      };
    }
  };

  const updateKnowledge = async (
    key: string,
    updates: { value?: string; category?: string; description?: string }
  ) => {
    if (!guildId) return;

    try {
      const response = await axios.patch(
        `${API_URL}/api/guilds/${guildId}/knowledge/${encodeURIComponent(key)}`,
        updates,
        { withCredentials: true }
      );
      await fetchKnowledge();
      await fetchCategories();
      return { success: true, data: response.data };
    } catch (err: any) {
      return {
        success: false,
        error: err.response?.data?.error || 'Failed to update knowledge',
      };
    }
  };

  const deleteKnowledge = async (key: string) => {
    if (!guildId) return;

    try {
      await axios.delete(
        `${API_URL}/api/guilds/${guildId}/knowledge/${encodeURIComponent(key)}`,
        { withCredentials: true }
      );
      await fetchKnowledge();
      await fetchCategories();
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.response?.data?.error || 'Failed to delete knowledge',
      };
    }
  };

  useEffect(() => {
    if (guildId) {
      fetchKnowledge();
      fetchCategories();
    }
  }, [guildId]);

  return {
    knowledge,
    categories,
    loading,
    error,
    fetchKnowledge,
    addKnowledge,
    updateKnowledge,
    deleteKnowledge,
  };
}
