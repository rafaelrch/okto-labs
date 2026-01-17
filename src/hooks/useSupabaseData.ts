import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Tipos baseados no schema do Supabase
export interface Client {
  id: string;
  user_id?: string;
  name: string;
  segment: string;
  logo: string;
  socials: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    linkedin?: string;
  };
  responsible_id?: string;
  color: string;
  status: 'active' | 'inactive';
  contract_start?: string;
  notes: string;
  created_at: string;
}

export interface Employee {
  id: string;
  user_id?: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  avatar: string;
  hire_date?: string;
  status: 'active' | 'inactive';
  skills: string[];
  created_at: string;
}

export interface Task {
  id: string;
  user_id?: string;
  title: string;
  description: string;
  responsible_id?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  client_id?: string;
  status: 'pending' | 'in_progress' | 'completed';
  tags: string[];
  created_at: string;
  completed_at?: string;
}

export interface Idea {
  id: string;
  user_id?: string;
  title: string;
  description: string;
  category: 'reels' | 'stories' | 'feed' | 'carousel' | 'tiktok' | 'other';
  tags: string[];
  status: 'new' | 'analyzing' | 'approved' | 'discarded';
  favorite: boolean;
  created_at: string;
}

export interface Content {
  id: string;
  user_id?: string;
  client_id?: string;
  type: 'post' | 'reels' | 'stories' | 'carousel' | 'tiktok';
  title: string;
  description: string;
  publish_date?: string;
  publish_time: string;
  social_network: 'instagram' | 'facebook' | 'tiktok' | 'linkedin';
  responsible_id?: string;
  status: 'draft' | 'production' | 'pending' | 'approved' | 'published' | 'rejected';
  files: string[];
  copy: string;
  hashtags: string[];
  created_at: string;
}

export interface Comment {
  id: string;
  content_id: string;
  user_id?: string;
  user_name: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface Mission {
  id: string;
  user_id?: string;
  title: string;
  description: string;
  points: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'available' | 'in_progress' | 'completed' | 'expired';
  deadline: string;
  created_by?: string;
  assigned_to?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

// Hook genérico para dados do Supabase
function useSupabaseTable<T extends { id: string }>(tableName: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: result, error: fetchError } = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setData(result as T[] || []);
      setError(null);
    } catch (err) {
      console.error(`Error fetching ${tableName}:`, err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [tableName]);

  const create = useCallback(async (item: Omit<T, 'id' | 'created_at'>) => {
    try {
      const { data: result, error: createError } = await supabase
        .from(tableName)
        .insert([item])
        .select()
        .single();

      if (createError) throw createError;
      setData(prev => [result as T, ...prev]);
      return result as T;
    } catch (err) {
      console.error(`Error creating ${tableName}:`, err);
      throw err;
    }
  }, [tableName]);

  const update = useCallback(async (id: string, updates: Partial<T>) => {
    try {
      const { data: result, error: updateError } = await supabase
        .from(tableName)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      setData(prev => prev.map(item => item.id === id ? result as T : item));
      return result as T;
    } catch (err) {
      console.error(`Error updating ${tableName}:`, err);
      throw err;
    }
  }, [tableName]);

  const remove = useCallback(async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      setData(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error(`Error deleting ${tableName}:`, err);
      throw err;
    }
  }, [tableName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData, create, update, remove, setData };
}

// Hooks específicos para cada tabela
export function useClients() {
  return useSupabaseTable<Client>('clients');
}

export function useEmployees() {
  return useSupabaseTable<Employee>('employees');
}

export function useTasks() {
  return useSupabaseTable<Task>('tasks');
}

export function useIdeas() {
  return useSupabaseTable<Idea>('ideas');
}

export function useContents() {
  return useSupabaseTable<Content>('contents');
}

export function useComments() {
  return useSupabaseTable<Comment>('comments');
}

export function useMissions() {
  return useSupabaseTable<Mission>('missions');
}
