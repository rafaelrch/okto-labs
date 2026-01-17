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

// Initialize with mock data if empty
export function initializeMockData() {
  const employees = getFromStorage<Employee>('employees');
  if (employees.length === 0) {
    const mockEmployees: Employee[] = [
      {
        id: generateId(),
        name: 'Ana Silva',
        role: 'Social Media Manager',
        email: 'ana@agencia.com',
        phone: '(11) 99999-1111',
        avatar: '',
        hireDate: '2023-01-15',
        status: 'active',
        skills: ['Instagram', 'Facebook', 'Planejamento'],
        createdAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        name: 'Carlos Santos',
        role: 'Designer',
        email: 'carlos@agencia.com',
        phone: '(11) 99999-2222',
        avatar: '',
        hireDate: '2023-03-10',
        status: 'active',
        skills: ['Photoshop', 'Illustrator', 'Figma'],
        createdAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        name: 'Maria Oliveira',
        role: 'Editor de Vídeo',
        email: 'maria@agencia.com',
        phone: '(11) 99999-3333',
        avatar: '',
        hireDate: '2023-06-01',
        status: 'active',
        skills: ['Premiere', 'After Effects', 'Reels'],
        createdAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        name: 'Pedro Costa',
        role: 'Redator',
        email: 'pedro@agencia.com',
        phone: '(11) 99999-4444',
        avatar: '',
        hireDate: '2023-08-20',
        status: 'active',
        skills: ['Copywriting', 'SEO', 'Storytelling'],
        createdAt: new Date().toISOString(),
      },
    ];
    saveToStorage('employees', mockEmployees);
  }

  const clients = getFromStorage<Client>('clients');
  if (clients.length === 0) {
    const savedEmployees = getFromStorage<Employee>('employees');
    const mockClients: Client[] = [
      {
        id: generateId(),
        name: 'Café Premium',
        segment: 'Alimentação',
        logo: '',
        socials: { instagram: '@cafepremium', facebook: 'cafepremium' },
        responsibleId: savedEmployees[0]?.id || '',
        color: '#3B82F6',
        status: 'active',
        contractStart: '2024-01-01',
        notes: 'Cliente desde janeiro, foco em reels de receitas',
        createdAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        name: 'Tech Solutions',
        segment: 'Tecnologia',
        logo: '',
        socials: { instagram: '@techsolutions', linkedin: 'techsolutions' },
        responsibleId: savedEmployees[0]?.id || '',
        color: '#10B981',
        status: 'active',
        contractStart: '2024-02-15',
        notes: 'Empresa B2B, conteúdo mais corporativo',
        createdAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        name: 'Fitness Life',
        segment: 'Saúde e Bem-estar',
        logo: '',
        socials: { instagram: '@fitnesslife', tiktok: '@fitnesslife' },
        responsibleId: savedEmployees[2]?.id || '',
        color: '#F59E0B',
        status: 'active',
        contractStart: '2024-03-01',
        notes: 'Academia, muitos vídeos de treinos',
        createdAt: new Date().toISOString(),
      },
    ];
    saveToStorage('clients', mockClients);
  }

  const ideas = getFromStorage<Idea>('ideas');
  if (ideas.length === 0) {
    const mockIdeas: Idea[] = [
      {
        id: generateId(),
        title: 'Série de receitas rápidas',
        description: 'Criar uma série de 5 reels mostrando receitas que podem ser feitas em menos de 5 minutos',
        category: 'reels',
        tags: ['receitas', 'café', 'rápido'],
        status: 'approved',
        favorite: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        title: 'Behind the scenes da empresa',
        description: 'Stories mostrando o dia a dia da equipe, bastidores e cultura da empresa',
        category: 'stories',
        tags: ['bastidores', 'equipe', 'cultura'],
        status: 'new',
        favorite: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        title: 'Carrossel educativo sobre tecnologia',
        description: 'Posts carrossel explicando conceitos tecnológicos de forma simples para o público',
        category: 'carousel',
        tags: ['educativo', 'tecnologia', 'tips'],
        status: 'analyzing',
        favorite: true,
        createdAt: new Date().toISOString(),
      },
    ];
    saveToStorage('ideas', mockIdeas);
  }

  const tasks = getFromStorage<Task>('tasks');
  if (tasks.length === 0) {
    const savedEmployees = getFromStorage<Employee>('employees');
    const savedClients = getFromStorage<Client>('clients');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const mockTasks: Task[] = [
      {
        id: generateId(),
        title: 'Criar arte para post de café',
        description: 'Desenvolver arte para o post promocional do novo blend',
        responsibleId: savedEmployees[1]?.id || '',
        priority: 'high',
        dueDate: today.toISOString().split('T')[0],
        clientId: savedClients[0]?.id,
        status: 'pending',
        tags: ['design', 'urgente'],
        createdAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        title: 'Editar reels de treino',
        description: 'Editar os 3 reels gravados na última sessão',
        responsibleId: savedEmployees[2]?.id || '',
        priority: 'medium',
        dueDate: tomorrow.toISOString().split('T')[0],
        clientId: savedClients[2]?.id,
        status: 'in_progress',
        tags: ['vídeo', 'edição'],
        createdAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        title: 'Escrever copy da campanha',
        description: 'Criar textos para a campanha de lançamento do produto',
        responsibleId: savedEmployees[3]?.id || '',
        priority: 'urgent',
        dueDate: today.toISOString().split('T')[0],
        clientId: savedClients[1]?.id,
        status: 'pending',
        tags: ['copy', 'campanha'],
        createdAt: new Date().toISOString(),
      },
    ];
    saveToStorage('tasks', mockTasks);
  }

  const contents = getFromStorage<Content>('contents');
  if (contents.length === 0) {
    const savedEmployees = getFromStorage<Employee>('employees');
    const savedClients = getFromStorage<Client>('clients');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const mockContents: Content[] = [
      {
        id: generateId(),
        clientId: savedClients[0]?.id || '',
        type: 'reels',
        title: 'Receita de Cappuccino Especial',
        description: 'Vídeo mostrando o preparo do cappuccino especial da casa',
        publishDate: today.toISOString().split('T')[0],
        publishTime: '18:00',
        socialNetwork: 'instagram',
        responsibleId: savedEmployees[2]?.id || '',
        status: 'pending',
        files: ['video_cappuccino.mp4'],
        copy: 'O cappuccino perfeito existe e está aqui! ☕✨ Vem ver como a gente prepara essa delícia!',
        hashtags: ['cafe', 'cappuccino', 'cafepremium', 'receita'],
        createdAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        clientId: savedClients[1]?.id || '',
        type: 'carousel',
        title: '5 tendências de tecnologia para 2024',
        description: 'Carrossel educativo sobre as principais tendências tech',
        publishDate: tomorrow.toISOString().split('T')[0],
        publishTime: '10:00',
        socialNetwork: 'linkedin',
        responsibleId: savedEmployees[1]?.id || '',
        status: 'approved',
        files: ['slide1.png', 'slide2.png', 'slide3.png'],
        copy: '2024 está chegando com tudo! 🚀 Confira as 5 tendências que vão transformar o mercado de tecnologia.',
        hashtags: ['tecnologia', 'tendencias2024', 'inovacao'],
        createdAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        clientId: savedClients[2]?.id || '',
        type: 'reels',
        title: 'Treino de 15 minutos em casa',
        description: 'Reels com treino rápido para fazer em qualquer lugar',
        publishDate: nextWeek.toISOString().split('T')[0],
        publishTime: '07:00',
        socialNetwork: 'instagram',
        responsibleId: savedEmployees[2]?.id || '',
        status: 'production',
        files: ['treino_casa.mp4'],
        copy: 'Sem tempo? Sem desculpas! 💪 15 minutos é tudo que você precisa para um treino completo!',
        hashtags: ['fitness', 'treino', 'workout', 'saude'],
        createdAt: new Date().toISOString(),
      },
    ];
    saveToStorage('contents', mockContents);
  }
}
