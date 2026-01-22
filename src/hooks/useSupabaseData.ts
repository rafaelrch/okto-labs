import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Tipos baseados no schema do Supabase
export interface Client {
  id: string;
  user_id?: string;
  name: string;
  segment: string;
  logo: string;
  logo_url?: string;
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
  contract_value?: number;
  contract_months?: number;
  services_sold?: string[];
  notes: string;
  created_at: string;
}

export interface Employee {
  id: string;
  user_id?: string;
  name: string;
  role: string;
  email: string;
  phone?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
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
  client_id?: string;
  title: string;
  description: string;
  category: 'reels' | 'stories' | 'feed' | 'carousel' | 'tiktok' | 'other';
  tags: string[];
  status: 'new' | 'analyzing' | 'approved' | 'discarded';
  favorite: boolean;
  reference_links?: string[];
  reference_files?: string[];
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
  deadline?: string;
  deadline_time?: string; // Horário do prazo
  social_network: 'instagram' | 'facebook' | 'tiktok' | 'linkedin';
  responsible_id?: string;
  status: 'draft' | 'production' | 'pending' | 'approved' | 'published' | 'rejected' | 'revision';
  files: string[]; // Arquivos de referência
  finalized_files?: string[]; // Arquivos de material finalizado
  reference_links?: string[]; // Links de referência
  finalized_links?: string[]; // Links de material finalizado
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

export interface Suggestion {
  id: string;
  user_id?: string;
  title: string;
  description: string;
  category: 'bug' | 'improvement' | 'feature' | 'ui' | 'other';
  status: 'pending' | 'under_review' | 'implemented' | 'rejected';
  priority: 'low' | 'medium' | 'high';
  files?: string[]; // URLs de arquivos anexados (imagens/vídeos)
  created_at: string;
  updated_at?: string;
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
      console.log(`[Supabase] Atualizando ${tableName} id: ${id}`, updates);
      const { data: result, error: updateError } = await supabase
        .from(tableName)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error(`[Supabase] Erro ao atualizar ${tableName}:`, updateError);
        throw updateError;
      }
      
      console.log(`[Supabase] ${tableName} atualizado com sucesso:`, result);
      setData(prev => prev.map(item => item.id === id ? result as T : item));
      return result as T;
    } catch (err) {
      console.error(`Error updating ${tableName}:`, err);
      throw err;
    }
  }, [tableName]);

  const remove = useCallback(async (id: string) => {
    try {
      console.log(`[Supabase] Deletando ${tableName} com id:`, id);
      
      const { error: deleteError, status, statusText } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      console.log(`[Supabase] Delete response - status: ${status}, statusText: ${statusText}`);
      
      if (deleteError) {
        console.error(`[Supabase] Delete error:`, deleteError);
        throw deleteError;
      }
      
      console.log(`[Supabase] ${tableName} deletado com sucesso`);
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

export function useSuggestions() {
  return useSupabaseTable<Suggestion>('suggestions');
}

export interface Approval {
  id: string;
  title: string;
  client_id?: string;
  status: 'content' | 'production' | 'pending' | 'approved' | 'revision' | 'rejected';
  files: string[];
  links: string[];
  created_by?: string;
  assigned_to?: string; // ID do funcionário responsável
  content_id?: string; // ID do conteúdo relacionado
  created_at: string;
  updated_at: string;
  position: number;
  // Campos de conteúdo
  content_type?: 'post' | 'card' | 'reels' | 'stories' | 'carousel' | 'tiktok';
  publish_date?: string;
  publish_time?: string;
  deadline?: string;
  briefing?: string;
  content_files?: string[]; // Arquivos do conteúdo para aprovação
}

export interface ApprovalComment {
  id: string;
  approval_id?: string; // Opcional agora que podemos usar content_id
  content_id?: string; // Para usar contents diretamente
  user_id?: string;
  message: string;
  image?: string; // URL da imagem anexada
  created_at: string;
  updated_at: string;
}

export function useApprovals() {
  return useSupabaseTable<Approval>('approvals');
}

export function useApprovalComments(approvalId?: string, contentId?: string) {
  const [data, setData] = useState<ApprovalComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!approvalId && !contentId) {
      setData([]);
      setLoading(false);
      return;
    }

    const fetchComments = async () => {
      setLoading(true);
      let query = supabase
        .from('approval_comments')
        .select('*');
      
      if (contentId) {
        query = query.eq('content_id', contentId);
      } else if (approvalId) {
        query = query.eq('approval_id', approvalId);
      }
      
      const { data: comments, error } = await query.order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching approval comments:', error);
        setData([]);
      } else {
        setData(comments || []);
      }
      setLoading(false);
    };

    fetchComments();

    // Subscribe to changes
    const filterId = contentId || approvalId;
    if (filterId) {
      const channel = supabase
        .channel(`approval_comments:${filterId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'approval_comments',
          filter: contentId ? `content_id=eq.${contentId}` : `approval_id=eq.${approvalId}`,
        }, () => {
          fetchComments();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [approvalId, contentId]);

  const create = async (comment: Omit<ApprovalComment, 'id' | 'created_at' | 'updated_at'>) => {
    const { data: newComment, error } = await supabase
      .from('approval_comments')
      .insert(comment)
      .select()
      .single();

    if (error) throw error;
    
    // Atualizar estado local imediatamente para feedback em tempo real
    if (newComment) {
      setData(prev => [...prev, newComment]);
    }
    
    return newComment;
  };

  return { data, loading, create };
}
