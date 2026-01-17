import { useState, useEffect, useCallback } from 'react';

export interface Mission {
  id: string;
  title: string;
  description: string;
  points: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'epic';
  category: 'daily' | 'weekly' | 'project' | 'special';
  status: 'available' | 'in_progress' | 'completed';
  deadline?: string | null;
  assigned_to?: string | null;
  completed_by?: string | null;
  completed_at?: string | null;
  created_at: string;
}

export interface EmployeePoints {
  employee_id: string;
  total_points: number;
  bonus_paid: number;
  last_updated: string;
}

const STORAGE_KEY = 'agency_missions';
const POINTS_STORAGE_KEY = 'agency_employee_points';

// Valor de cada ponto em reais - configurável
export const POINT_VALUE = 0.50;

// Níveis/Patentes baseado em pontos
export const RANKS = [
  { name: 'Bronze', minPoints: 0, maxPoints: 499, color: 'bg-orange-600', icon: '🥉' },
  { name: 'Prata', minPoints: 500, maxPoints: 1499, color: 'bg-gray-400', icon: '🥈' },
  { name: 'Ouro', minPoints: 1500, maxPoints: 2999, color: 'bg-yellow-500', icon: '🥇' },
  { name: 'Platina', minPoints: 3000, maxPoints: 4999, color: 'bg-cyan-400', icon: '💎' },
  { name: 'Diamante', minPoints: 5000, maxPoints: 9999, color: 'bg-purple-500', icon: '👑' },
  { name: 'Lendário', minPoints: 10000, maxPoints: Infinity, color: 'bg-gradient-to-r from-yellow-400 via-red-500 to-purple-600', icon: '🌟' },
];

export function getRank(points: number) {
  return RANKS.find(r => points >= r.minPoints && points <= r.maxPoints) || RANKS[0];
}

export function getNextRank(points: number) {
  const currentRankIndex = RANKS.findIndex(r => points >= r.minPoints && points <= r.maxPoints);
  return RANKS[currentRankIndex + 1] || null;
}

export function getProgressToNextRank(points: number) {
  const currentRank = getRank(points);
  const nextRank = getNextRank(points);
  if (!nextRank) return 100;
  const pointsInCurrentRank = points - currentRank.minPoints;
  const pointsNeededForNext = nextRank.minPoints - currentRank.minPoints;
  return Math.min(100, Math.round((pointsInCurrentRank / pointsNeededForNext) * 100));
}

// Conquistas/Medalhas
export const ACHIEVEMENTS = [
  { id: 'first_mission', name: 'Primeira Missão', description: 'Complete sua primeira missão', icon: '🎯', requirement: 1 },
  { id: 'five_missions', name: 'Iniciante', description: 'Complete 5 missões', icon: '⭐', requirement: 5 },
  { id: 'ten_missions', name: 'Dedicado', description: 'Complete 10 missões', icon: '🌟', requirement: 10 },
  { id: 'twenty_five_missions', name: 'Veterano', description: 'Complete 25 missões', icon: '🏆', requirement: 25 },
  { id: 'fifty_missions', name: 'Mestre', description: 'Complete 50 missões', icon: '👑', requirement: 50 },
  { id: 'hundred_points', name: 'Centenário', description: 'Acumule 100 pontos', icon: '💯', requirement: 100, type: 'points' },
  { id: 'five_hundred_points', name: 'Alto Valor', description: 'Acumule 500 pontos', icon: '💰', requirement: 500, type: 'points' },
  { id: 'thousand_points', name: 'Milionário', description: 'Acumule 1000 pontos', icon: '💎', requirement: 1000, type: 'points' },
  { id: 'epic_mission', name: 'Herói Épico', description: 'Complete uma missão épica', icon: '🔥', requirement: 1, type: 'epic' },
  { id: 'daily_streak', name: 'Consistente', description: 'Complete missões em 5 dias seguidos', icon: '📅', requirement: 5, type: 'streak' },
];

export function getUnlockedAchievements(completedCount: number, totalPoints: number, epicCount: number) {
  return ACHIEVEMENTS.filter(a => {
    if (a.type === 'points') return totalPoints >= a.requirement;
    if (a.type === 'epic') return epicCount >= a.requirement;
    if (a.type === 'streak') return false; // Implementar lógica de streak depois
    return completedCount >= a.requirement;
  });
}

function getMissions(): Mission[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveMissions(missions: Mission[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(missions));
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function useMissionsLocal() {
  const [data, setData] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    try {
      setLoading(true);
      const missions = getMissions();
      setData(missions);
      setError(null);
    } catch (err) {
      setError('Erro ao carregar missões');
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback((item: Omit<Mission, 'id' | 'created_at'>) => {
    const newMission: Mission = {
      ...item,
      id: generateId(),
      created_at: new Date().toISOString(),
    };
    const updated = [newMission, ...data];
    saveMissions(updated);
    setData(updated);
    return newMission;
  }, [data]);

  const update = useCallback((id: string, updates: Partial<Mission>) => {
    const updated = data.map(item => 
      item.id === id ? { ...item, ...updates } : item
    );
    saveMissions(updated);
    setData(updated);
    return updated.find(m => m.id === id);
  }, [data]);

  const remove = useCallback((id: string) => {
    const updated = data.filter(item => item.id !== id);
    saveMissions(updated);
    setData(updated);
  }, [data]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData, create, update, remove, setData };
}

// Hook para funcionários com localStorage
export interface LocalEmployee {
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

const EMPLOYEES_STORAGE_KEY = 'agency_employees';

function getEmployees(): LocalEmployee[] {
  try {
    const data = localStorage.getItem(EMPLOYEES_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveEmployees(employees: LocalEmployee[]): void {
  localStorage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(employees));
}

export function useEmployeesLocal() {
  const [data, setData] = useState<LocalEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    const employees = getEmployees();
    // Se não houver funcionários, criar alguns de exemplo
    if (employees.length === 0) {
      const defaultEmployees: LocalEmployee[] = [
        {
          id: generateId(),
          name: 'João Silva',
          role: 'Designer',
          email: 'joao@agencia.com',
          phone: '(11) 99999-1111',
          avatar: '',
          hireDate: '2024-01-15',
          status: 'active',
          skills: ['Design', 'Photoshop', 'Ilustração'],
          createdAt: new Date().toISOString(),
        },
        {
          id: generateId(),
          name: 'Maria Santos',
          role: 'Social Media',
          email: 'maria@agencia.com',
          phone: '(11) 99999-2222',
          avatar: '',
          hireDate: '2024-02-01',
          status: 'active',
          skills: ['Redes Sociais', 'Copywriting', 'Analytics'],
          createdAt: new Date().toISOString(),
        },
        {
          id: generateId(),
          name: 'Pedro Costa',
          role: 'Desenvolvedor',
          email: 'pedro@agencia.com',
          phone: '(11) 99999-3333',
          avatar: '',
          hireDate: '2024-03-10',
          status: 'active',
          skills: ['React', 'TypeScript', 'Node.js'],
          createdAt: new Date().toISOString(),
        },
      ];
      saveEmployees(defaultEmployees);
      setData(defaultEmployees);
    } else {
      setData(employees);
    }
    setLoading(false);
  }, []);

  const create = useCallback((item: Omit<LocalEmployee, 'id' | 'createdAt'>) => {
    const newEmployee: LocalEmployee = {
      ...item,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    const updated = [newEmployee, ...data];
    saveEmployees(updated);
    setData(updated);
    return newEmployee;
  }, [data]);

  const update = useCallback((id: string, updates: Partial<LocalEmployee>) => {
    const updated = data.map(item => 
      item.id === id ? { ...item, ...updates } : item
    );
    saveEmployees(updated);
    setData(updated);
    return updated.find(e => e.id === id);
  }, [data]);

  const remove = useCallback((id: string) => {
    const updated = data.filter(item => item.id !== id);
    saveEmployees(updated);
    setData(updated);
  }, [data]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, refetch: fetchData, create, update, remove };
}
