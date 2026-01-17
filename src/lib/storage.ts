// Storage utility for data persistence
export interface Client {
  id: string;
  name: string;
  segment: string;
  logo: string;
  socials: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    linkedin?: string;
  };
  responsibleId: string;
  color: string;
  status: 'active' | 'inactive';
  contractStart: string;
  notes: string;
  createdAt: string;
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  category: 'reels' | 'stories' | 'feed' | 'carousel' | 'tiktok' | 'other';
  tags: string[];
  status: 'new' | 'analyzing' | 'approved' | 'discarded';
  favorite: boolean;
  createdAt: string;
}

export interface Content {
  id: string;
  clientId: string;
  type: 'post' | 'reels' | 'stories' | 'carousel' | 'tiktok';
  title: string;
  description: string;
  publishDate: string;
  publishTime: string;
  socialNetwork: 'instagram' | 'facebook' | 'tiktok' | 'linkedin';
  responsibleId: string;
  status: 'draft' | 'production' | 'pending' | 'approved' | 'published' | 'rejected';
  files: string[];
  copy: string;
  hashtags: string[];
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  responsibleId: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string;
  clientId?: string;
  status: 'pending' | 'in_progress' | 'completed';
  tags: string[];
  createdAt: string;
  completedAt?: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  avatar: string;
  hireDate: string;
  status: 'active' | 'inactive';
  skills: string[];
  createdAt: string;
}

export interface Comment {
  id: string;
  contentId: string;
  userId: string;
  userName: string;
  message: string;
  createdAt: string;
  read: boolean;
}

const STORAGE_KEYS = {
  clients: 'agency_clients',
  ideas: 'agency_ideas',
  contents: 'agency_contents',
  tasks: 'agency_tasks',
  employees: 'agency_employees',
  comments: 'agency_comments',
} as const;

export function getFromStorage<T>(key: keyof typeof STORAGE_KEYS): T[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS[key]);
    return data ? JSON.parse(data) : [];
  } catch {
    console.error(`Error reading ${key} from storage`);
    return [];
  }
}

export function saveToStorage<T>(key: keyof typeof STORAGE_KEYS, data: T[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(data));
  } catch {
    console.error(`Error saving ${key} to storage`);
  }
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Função removida - não mais necessária pois usamos dados reais do Supabase
export function initializeMockData() {
  // Dados agora vêm do Supabase, não do localStorage
  console.log('Mock data initialization skipped - using Supabase');
}
