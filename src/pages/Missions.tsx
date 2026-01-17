import { useState, useMemo } from 'react';
import { 
  Plus, 
  Target, 
  Trophy, 
  Star, 
  CheckCircle2, 
  Clock, 
  User,
  Coins,
  Loader2,
  Edit2,
  Trash2,
  Play,
  Award,
  DollarSign,
  TrendingUp,
  Gift
} from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useMissions, useEmployees, Mission } from '@/hooks/useSupabaseData';
import { useAuth } from '@/hooks/useAuth';

interface MissionsPageProps {
  searchQuery: string;
}

// Valor de cada ponto em reais
const POINT_VALUE = 0.50; // R$ 0,50 por ponto

const difficultyLevels = [
  { value: 'easy', label: 'Fácil', color: 'bg-success/20 text-success', points: '10-50' },
  { value: 'medium', label: 'Média', color: 'bg-warning/20 text-warning', points: '51-100' },
  { value: 'hard', label: 'Difícil', color: 'bg-destructive/20 text-destructive', points: '101-200' },
  { value: 'epic', label: 'Épica', color: 'bg-primary/20 text-primary', points: '201+' },
];

const categories = [
  { value: 'daily', label: 'Diária' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'project', label: 'Projeto' },
  { value: 'special', label: 'Especial' },
];

export function MissionsPage({ searchQuery }: MissionsPageProps) {
  const { data: missions, loading, create, update, remove, error } = useMissions();
  const { data: employees } = useEmployees();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBonusModalOpen, setIsBonusModalOpen] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'in_progress' | 'completed'>('all');
  const [selectedEmployeeForBonus, setSelectedEmployeeForBonus] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    points: 50,
    difficulty: 'medium' as Mission['difficulty'],
    category: 'daily' as Mission['category'],
    deadline: '',
  });

  // Calcular pontos por funcionário
  const employeePoints = useMemo(() => {
    return employees.map(emp => {
      const completedMissions = missions.filter(
        m => m.completed_by === emp.id && m.status === 'completed'
      );
      const totalPoints = completedMissions.reduce((sum, m) => sum + m.points, 0);
      const bonusValue = totalPoints * POINT_VALUE;
      return { 
        ...emp, 
        totalPoints, 
        completedCount: completedMissions.length,
        bonusValue,
        missions: completedMissions
      };
    }).sort((a, b) => b.totalPoints - a.totalPoints);
  }, [employees, missions]);

  const selectedEmployee = useMemo(() => {
    return employeePoints.find(e => e.id === selectedEmployeeForBonus);
  }, [employeePoints, selectedEmployeeForBonus]);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      points: 50,
      difficulty: 'medium',
      category: 'daily',
      deadline: '',
    });
    setEditingMission(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const missionData = {
      title: formData.title,
      description: formData.description,
      points: formData.points,
      difficulty: formData.difficulty,
      category: formData.category,
      deadline: formData.deadline || null,
      status: 'available' as const,
      assigned_to: null,
      completed_by: null,
      completed_at: null,
    };

    try {
      if (editingMission) {
        await update(editingMission.id, missionData);
        toast.success('Missão atualizada!');
      } else {
        await create(missionData as any);
        toast.success('Missão criada!');
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      toast.error('Erro ao salvar missão. Verifique se a tabela existe no banco.');
    }
  };

  const handleEdit = (mission: Mission) => {
    setFormData({
      title: mission.title,
      description: mission.description,
      points: mission.points,
      difficulty: mission.difficulty,
      category: mission.category,
      deadline: mission.deadline || '',
    });
    setEditingMission(mission);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(id);
      toast.success('Missão excluída!');
    } catch {
      toast.error('Erro ao excluir missão');
    }
  };

  const handleClaimMission = async (mission: Mission) => {
    const currentEmployee = employees.find(e => e.email === user?.email);
    if (!currentEmployee) {
      toast.error('Você precisa estar cadastrado como funcionário para aceitar missões');
      return;
    }

    try {
      await update(mission.id, {
        status: 'in_progress',
        assigned_to: currentEmployee.id,
      });
      toast.success('Missão iniciada! Boa sorte! 🚀');
    } catch {
      toast.error('Erro ao aceitar missão');
    }
  };

  const handleCompleteMission = async (mission: Mission) => {
    try {
      await update(mission.id, {
        status: 'completed',
        completed_by: mission.assigned_to,
        completed_at: new Date().toISOString(),
      });
      toast.success(`Missão concluída! +${mission.points} pontos 🎉`);
    } catch {
      toast.error('Erro ao concluir missão');
    }
  };

  const handleCancelMission = async (mission: Mission) => {
    try {
      await update(mission.id, {
        status: 'available',
        assigned_to: null,
      });
      toast.info('Missão liberada');
    } catch {
      toast.error('Erro ao liberar missão');
    }
  };

  const filteredMissions = missions.filter(mission => {
    const matchesSearch = 
      mission.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mission.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || mission.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getEmployeeName = (id?: string | null) => {
    if (!id) return 'Não atribuído';
    return employees.find(e => e.id === id)?.name || 'Desconhecido';
  };

  const getDifficultyStyle = (difficulty: Mission['difficulty']) => {
    return difficultyLevels.find(d => d.value === difficulty) || difficultyLevels[1];
  };

  const stats = {
    available: missions.filter(m => m.status === 'available').length,
    inProgress: missions.filter(m => m.status === 'in_progress').length,
    completed: missions.filter(m => m.status === 'completed').length,
    totalPoints: missions.filter(m => m.status === 'completed').reduce((sum, m) => sum + m.points, 0),
    totalBonus: missions.filter(m => m.status === 'completed').reduce((sum, m) => sum + m.points, 0) * POINT_VALUE,
  };

  const currentEmployee = employees.find(e => e.email === user?.email);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-6 text-center">
          <Target className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Tabela de Missões não encontrada</h2>
          <p className="text-muted-foreground mb-4">
            A tabela "missions" precisa ser criada no Supabase. Execute o SQL abaixo no SQL Editor do seu Supabase:
          </p>
          <div className="bg-muted rounded-lg p-4 text-left text-xs font-mono overflow-x-auto">
            <pre>{`CREATE TABLE IF NOT EXISTS public.missions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 50,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  category TEXT NOT NULL DEFAULT 'daily',
  status TEXT NOT NULL DEFAULT 'available',
  deadline DATE,
  assigned_to UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  completed_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir tudo em missões" ON public.missions
  FOR ALL USING (true) WITH CHECK (true);`}</pre>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-card-foreground">{stats.available}</p>
              <p className="text-xs text-muted-foreground">Disponíveis</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-card-foreground">{stats.inProgress}</p>
              <p className="text-xs text-muted-foreground">Em Andamento</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-card-foreground">{stats.completed}</p>
              <p className="text-xs text-muted-foreground">Concluídas</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Coins className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-card-foreground">{stats.totalPoints}</p>
              <p className="text-xs text-muted-foreground">Pontos Totais</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-success/20 to-success/5 rounded-xl border border-success/30 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-success">
                R$ {stats.totalBonus.toFixed(2).replace('.', ',')}
              </p>
              <p className="text-xs text-success/80">Total Bonificação</p>
            </div>
          </div>
        </div>
      </div>

      {/* Valor por ponto */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-xl border border-primary/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Gift className="w-6 h-6 text-primary" />
            <div>
              <p className="font-semibold text-foreground">Sistema de Bonificação</p>
              <p className="text-sm text-muted-foreground">
                Cada ponto vale <span className="font-bold text-primary">R$ {POINT_VALUE.toFixed(2).replace('.', ',')}</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsBonusModalOpen(true)}
            className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-colors"
          >
            Ver Bonificações
          </button>
        </div>
      </div>

      {/* Leaderboard / Ranking */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-warning" />
            <h2 className="font-semibold text-card-foreground">Ranking de Pontos</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Clique em um funcionário para ver detalhes
          </p>
        </div>
        <div className="p-4">
          {employeePoints.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {employeePoints.slice(0, 10).map((emp, index) => (
                <button
                  key={emp.id}
                  onClick={() => {
                    setSelectedEmployeeForBonus(emp.id);
                    setIsBonusModalOpen(true);
                  }}
                  className={cn(
                    "flex-shrink-0 flex items-center gap-3 p-4 rounded-xl min-w-[240px] transition-all hover:scale-105",
                    index === 0 ? "bg-gradient-to-br from-warning/20 to-warning/5 border-2 border-warning/40 shadow-lg" :
                    index === 1 ? "bg-gradient-to-br from-gray-300/20 to-gray-300/5 border border-gray-400/30" :
                    index === 2 ? "bg-gradient-to-br from-orange-400/20 to-orange-400/5 border border-orange-400/30" : 
                    "bg-muted/50 border border-border hover:border-primary/30"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm",
                    index === 0 ? "bg-warning text-warning-foreground" :
                    index === 1 ? "bg-gray-400 text-white" :
                    index === 2 ? "bg-orange-500 text-white" : "bg-muted-foreground/30 text-foreground"
                  )}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium text-sm text-foreground truncate">{emp.name}</p>
                    <p className="text-xs text-muted-foreground">{emp.completedCount} missões</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-primary font-bold">
                      <Star className="w-4 h-4 fill-primary" />
                      {emp.totalPoints}
                    </div>
                    <p className="text-xs text-success font-medium">
                      R$ {emp.bonusValue.toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-4">
              Nenhum funcionário cadastrado. Adicione funcionários na página de Funcionários.
            </p>
          )}
        </div>
      </div>

      {/* My Points - se o usuário logado for um funcionário */}
      {currentEmployee && (
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl border border-primary/20 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
                <User className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Meus Pontos</p>
                <p className="text-3xl font-bold text-foreground">
                  {employeePoints.find(e => e.id === currentEmployee.id)?.totalPoints || 0}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Minha Bonificação</p>
              <p className="text-2xl font-bold text-success">
                R$ {((employeePoints.find(e => e.id === currentEmployee.id)?.totalPoints || 0) * POINT_VALUE).toFixed(2).replace('.', ',')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'all', label: 'Todas' },
            { value: 'available', label: 'Disponíveis' },
            { value: 'in_progress', label: 'Em Andamento' },
            { value: 'completed', label: 'Concluídas' },
          ].map(filter => (
            <button
              key={filter.value}
              onClick={() => setFilterStatus(filter.value as any)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-lg transition-colors',
                filterStatus === filter.value 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 btn-primary-gradient rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Nova Missão
        </button>
      </div>

      {/* Missions Grid */}
      {filteredMissions.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Nenhuma missão encontrada"
          description="Crie uma nova missão para a equipe começar a ganhar pontos!"
          action={{
            label: 'Criar Missão',
            onClick: () => { resetForm(); setIsModalOpen(true); }
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMissions.map(mission => {
            const diffStyle = getDifficultyStyle(mission.difficulty);
            const isAssignedToMe = mission.assigned_to === currentEmployee?.id;

            return (
              <div 
                key={mission.id} 
                className={cn(
                  "bg-card rounded-xl border overflow-hidden card-hover",
                  mission.status === 'completed' ? "border-success/30 bg-success/5" :
                  mission.status === 'in_progress' ? "border-warning/30" : "border-border"
                )}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={cn("px-2 py-1 rounded-md text-xs font-medium", diffStyle.color)}>
                        {diffStyle.label}
                      </span>
                      <span className="px-2 py-1 bg-muted text-muted-foreground rounded-md text-xs">
                        {categories.find(c => c.value === mission.category)?.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-lg">
                      <Star className="w-4 h-4 text-primary fill-primary" />
                      <span className="font-bold text-primary">{mission.points}</span>
                    </div>
                  </div>

                  <h3 className="font-semibold text-card-foreground mb-2">{mission.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{mission.description}</p>

                  <div className="flex items-center gap-3 mb-3 text-xs text-muted-foreground">
                    {mission.deadline && (
                      <span>⏰ {format(new Date(mission.deadline), "dd/MM", { locale: ptBR })}</span>
                    )}
                    <span className="text-success font-medium">
                      💰 R$ {(mission.points * POINT_VALUE).toFixed(2).replace('.', ',')}
                    </span>
                  </div>

                  {mission.status === 'in_progress' && (
                    <div className="flex items-center gap-2 mb-3 p-2 bg-warning/10 rounded-lg">
                      <User className="w-4 h-4 text-warning" />
                      <span className="text-sm text-warning font-medium">
                        {getEmployeeName(mission.assigned_to)}
                      </span>
                    </div>
                  )}

                  {mission.status === 'completed' && (
                    <div className="flex items-center gap-2 mb-3 p-2 bg-success/10 rounded-lg">
                      <Award className="w-4 h-4 text-success" />
                      <span className="text-sm text-success font-medium">
                        {getEmployeeName(mission.completed_by)}
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    {mission.status === 'available' && (
                      <button
                        onClick={() => handleClaimMission(mission)}
                        className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 font-medium"
                      >
                        <Play className="w-4 h-4" /> Aceitar Missão
                      </button>
                    )}

                    {mission.status === 'in_progress' && isAssignedToMe && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCompleteMission(mission)}
                          className="flex items-center gap-1 text-sm text-success hover:text-success/80 font-medium"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Concluir
                        </button>
                        <button
                          onClick={() => handleCancelMission(mission)}
                          className="text-sm text-muted-foreground hover:text-destructive"
                        >
                          Desistir
                        </button>
                      </div>
                    )}

                    {mission.status === 'in_progress' && !isAssignedToMe && (
                      <span className="text-sm text-warning">🔄 Em andamento...</span>
                    )}

                    {mission.status === 'completed' && (
                      <span className="text-sm text-success font-medium">✓ Concluída</span>
                    )}

                    <div className="flex items-center gap-1">
                      {mission.status === 'available' && (
                        <>
                          <button
                            onClick={() => handleEdit(mission)}
                            className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(mission.id)}
                            className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editingMission ? 'Editar Missão' : 'Nova Missão'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Título da Missão *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Criar 5 posts para o cliente X"
              className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Descrição *</label>
            <textarea
              required
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva o que precisa ser feito..."
              className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Pontos *</label>
              <input
                type="number"
                required
                min={1}
                max={500}
                value={formData.points}
                onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-success mt-1">
                = R$ {(formData.points * POINT_VALUE).toFixed(2).replace('.', ',')}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Dificuldade</label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as Mission['difficulty'] })}
                className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
              >
                {difficultyLevels.map(level => (
                  <option key={level.value} value={level.value}>
                    {level.label} ({level.points} pts)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Categoria</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as Mission['category'] })}
                className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Prazo (opcional)</label>
            <input
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => { setIsModalOpen(false); resetForm(); }}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 btn-primary-gradient rounded-lg text-sm font-medium"
            >
              {editingMission ? 'Salvar' : 'Criar Missão'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Bonus Details Modal */}
      <Modal
        isOpen={isBonusModalOpen}
        onClose={() => { setIsBonusModalOpen(false); setSelectedEmployeeForBonus(null); }}
        title="Detalhes de Bonificação"
        size="lg"
      >
        <div className="space-y-6">
          {/* Resumo geral ou por funcionário */}
          {selectedEmployee ? (
            <>
              {/* Perfil do funcionário */}
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                <div className="w-16 h-16 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold">
                  {selectedEmployee.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground">{selectedEmployee.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedEmployee.role}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-primary">{selectedEmployee.totalPoints}</p>
                  <p className="text-sm text-muted-foreground">pontos</p>
                </div>
              </div>

              {/* Valor da bonificação */}
              <div className="bg-gradient-to-r from-success/20 to-success/5 rounded-xl p-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">Bonificação Total</p>
                <p className="text-4xl font-bold text-success">
                  R$ {selectedEmployee.bonusValue.toFixed(2).replace('.', ',')}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {selectedEmployee.totalPoints} pontos × R$ {POINT_VALUE.toFixed(2).replace('.', ',')}
                </p>
              </div>

              {/* Histórico de missões */}
              <div>
                <h4 className="font-semibold text-foreground mb-3">Missões Concluídas ({selectedEmployee.completedCount})</h4>
                {selectedEmployee.missions.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedEmployee.missions.map(m => (
                      <div key={m.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{m.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {m.completed_at && format(new Date(m.completed_at), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">+{m.points}</p>
                          <p className="text-xs text-success">R$ {(m.points * POINT_VALUE).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Nenhuma missão concluída ainda</p>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Resumo geral de todos */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/50 rounded-xl p-4 text-center">
                  <TrendingUp className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold text-foreground">{stats.totalPoints}</p>
                  <p className="text-sm text-muted-foreground">Pontos Distribuídos</p>
                </div>
                <div className="bg-success/10 rounded-xl p-4 text-center">
                  <DollarSign className="w-8 h-8 text-success mx-auto mb-2" />
                  <p className="text-2xl font-bold text-success">
                    R$ {stats.totalBonus.toFixed(2).replace('.', ',')}
                  </p>
                  <p className="text-sm text-muted-foreground">Total em Bonificações</p>
                </div>
              </div>

              {/* Lista de funcionários */}
              <div>
                <h4 className="font-semibold text-foreground mb-3">Bonificação por Funcionário</h4>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {employeePoints.map((emp, index) => (
                    <div 
                      key={emp.id} 
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => setSelectedEmployeeForBonus(emp.id)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-medium text-sm">{emp.name}</p>
                          <p className="text-xs text-muted-foreground">{emp.completedCount} missões</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground">{emp.totalPoints} pts</p>
                        <p className="text-sm text-success font-medium">
                          R$ {emp.bonusValue.toFixed(2).replace('.', ',')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabela de valores */}
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="font-semibold text-foreground mb-2">Tabela de Conversão</h4>
                <p className="text-sm text-muted-foreground">
                  1 ponto = <span className="text-primary font-bold">R$ {POINT_VALUE.toFixed(2).replace('.', ',')}</span>
                </p>
                <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="bg-muted rounded p-2">
                    <p className="font-bold">50 pts</p>
                    <p className="text-success">R$ {(50 * POINT_VALUE).toFixed(2)}</p>
                  </div>
                  <div className="bg-muted rounded p-2">
                    <p className="font-bold">100 pts</p>
                    <p className="text-success">R$ {(100 * POINT_VALUE).toFixed(2)}</p>
                  </div>
                  <div className="bg-muted rounded p-2">
                    <p className="font-bold">200 pts</p>
                    <p className="text-success">R$ {(200 * POINT_VALUE).toFixed(2)}</p>
                  </div>
                  <div className="bg-muted rounded p-2">
                    <p className="font-bold">500 pts</p>
                    <p className="text-success">R$ {(500 * POINT_VALUE).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
