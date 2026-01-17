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
  Gift,
  Medal,
  Zap,
  Crown
} from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { 
  useMissionsLocal, 
  useEmployeesLocal, 
  Mission, 
  POINT_VALUE, 
  RANKS, 
  ACHIEVEMENTS,
  getRank,
  getNextRank,
  getProgressToNextRank,
  getUnlockedAchievements
} from '@/hooks/useMissionsLocal';

interface MissionsPageProps {
  searchQuery: string;
}

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
  const { data: missions, loading, create, update, remove } = useMissionsLocal();
  const { data: employees } = useEmployeesLocal();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBonusModalOpen, setIsBonusModalOpen] = useState(false);
  const [isAchievementsModalOpen, setIsAchievementsModalOpen] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'in_progress' | 'completed'>('all');
  const [selectedEmployeeForBonus, setSelectedEmployeeForBonus] = useState<string | null>(null);
  const [currentUserEmployeeId, setCurrentUserEmployeeId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    points: 50,
    difficulty: 'medium' as Mission['difficulty'],
    category: 'daily' as Mission['category'],
    deadline: '',
  });

  // Calcular pontos por funcionário com rank e conquistas
  const employeePoints = useMemo(() => {
    return employees.map(emp => {
      const completedMissions = missions.filter(
        m => m.completed_by === emp.id && m.status === 'completed'
      );
      const epicMissions = completedMissions.filter(m => m.difficulty === 'epic').length;
      const totalPoints = completedMissions.reduce((sum, m) => sum + m.points, 0);
      const bonusValue = totalPoints * POINT_VALUE;
      const rank = getRank(totalPoints);
      const nextRank = getNextRank(totalPoints);
      const progressToNext = getProgressToNextRank(totalPoints);
      const achievements = getUnlockedAchievements(completedMissions.length, totalPoints, epicMissions);
      
      return { 
        ...emp, 
        totalPoints, 
        completedCount: completedMissions.length,
        epicCount: epicMissions,
        bonusValue,
        missions: completedMissions,
        rank,
        nextRank,
        progressToNext,
        achievements
      };
    }).sort((a, b) => b.totalPoints - a.totalPoints);
  }, [employees, missions]);

  const selectedEmployee = useMemo(() => {
    return employeePoints.find(e => e.id === selectedEmployeeForBonus);
  }, [employeePoints, selectedEmployeeForBonus]);

  const currentEmployee = useMemo(() => {
    return currentUserEmployeeId ? employeePoints.find(e => e.id === currentUserEmployeeId) : null;
  }, [employeePoints, currentUserEmployeeId]);

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

  const handleSubmit = (e: React.FormEvent) => {
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

    if (editingMission) {
      update(editingMission.id, missionData);
      toast.success('Missão atualizada!');
    } else {
      create(missionData);
      toast.success('Missão criada! 🎯');
    }
    setIsModalOpen(false);
    resetForm();
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

  const handleDelete = (id: string) => {
    remove(id);
    toast.success('Missão excluída!');
  };

  const handleClaimMission = (mission: Mission) => {
    if (!currentUserEmployeeId) {
      // Selecionar funcionário se não estiver definido
      if (employees.length > 0) {
        setCurrentUserEmployeeId(employees[0].id);
        update(mission.id, {
          status: 'in_progress',
          assigned_to: employees[0].id,
        });
        toast.success(`Missão iniciada por ${employees[0].name}! 🚀`);
      } else {
        toast.error('Nenhum funcionário cadastrado');
      }
      return;
    }

    update(mission.id, {
      status: 'in_progress',
      assigned_to: currentUserEmployeeId,
    });
    toast.success('Missão iniciada! Boa sorte! 🚀');
  };

  const handleCompleteMission = (mission: Mission) => {
    update(mission.id, {
      status: 'completed',
      completed_by: mission.assigned_to,
      completed_at: new Date().toISOString(),
    });
    toast.success(`Missão concluída! +${mission.points} pontos 🎉`);
  };

  const handleCancelMission = (mission: Mission) => {
    update(mission.id, {
      status: 'available',
      assigned_to: null,
    });
    toast.info('Missão liberada');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com Título */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <Target className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Sistema de Missões</h1>
            <p className="text-sm text-muted-foreground">Complete missões, ganhe pontos e receba bonificações!</p>
          </div>
        </div>
        <button
          onClick={() => setIsAchievementsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-600 rounded-lg text-sm font-medium hover:from-yellow-500/30 hover:to-orange-500/30 transition-all"
        >
          <Medal className="w-4 h-4" /> Ver Conquistas
        </button>
      </div>

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
              <Coins className="w-5 h-5 text-primary" />
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

      {/* Patentes/Ranks Info */}
      <div className="bg-gradient-to-r from-purple-500/10 via-primary/10 to-yellow-500/10 rounded-xl border border-primary/20 p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Crown className="w-6 h-6 text-yellow-500" />
            <div>
              <p className="font-semibold text-foreground">Sistema de Patentes</p>
              <p className="text-sm text-muted-foreground">Acumule pontos e suba de nível!</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {RANKS.slice(0, 5).map(rank => (
              <div key={rank.name} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1", rank.color, "text-white")}>
                <span>{rank.icon}</span> {rank.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Valor por ponto */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-xl border border-primary/20 p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
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

      {/* Selecionar funcionário atual */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-4">
          <User className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Você é:</span>
          <select
            value={currentUserEmployeeId || ''}
            onChange={(e) => setCurrentUserEmployeeId(e.target.value || null)}
            className="px-3 py-1.5 bg-muted rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Selecione seu perfil...</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name} - {emp.role}</option>
            ))}
          </select>
          {currentEmployee && (
            <div className="flex items-center gap-2 ml-auto">
              <span className={cn("px-3 py-1.5 rounded-lg text-xs font-medium text-white", currentEmployee.rank.color)}>
                {currentEmployee.rank.icon} {currentEmployee.rank.name}
              </span>
              <span className="text-sm font-bold text-primary">{currentEmployee.totalPoints} pts</span>
            </div>
          )}
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
                    "flex-shrink-0 flex flex-col items-center gap-2 p-4 rounded-xl min-w-[160px] transition-all hover:scale-105",
                    index === 0 ? "bg-gradient-to-br from-warning/20 to-warning/5 border-2 border-warning/40 shadow-lg" :
                    index === 1 ? "bg-gradient-to-br from-gray-300/20 to-gray-300/5 border border-gray-400/30" :
                    index === 2 ? "bg-gradient-to-br from-orange-400/20 to-orange-400/5 border border-orange-400/30" : 
                    "bg-muted/50 border border-border hover:border-primary/30"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg",
                    index === 0 ? "bg-warning text-warning-foreground" :
                    index === 1 ? "bg-gray-400 text-white" :
                    index === 2 ? "bg-orange-500 text-white" : "bg-muted-foreground/30 text-foreground"
                  )}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-sm text-foreground truncate max-w-[120px]">{emp.name}</p>
                    <span className={cn("text-xs px-2 py-0.5 rounded mt-1 inline-block text-white", emp.rank.color)}>
                      {emp.rank.icon} {emp.rank.name}
                    </span>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-primary font-bold">
                      <Star className="w-4 h-4 fill-primary" />
                      {emp.totalPoints}
                    </div>
                    <p className="text-xs text-success font-medium">
                      R$ {emp.bonusValue.toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                  {emp.achievements.length > 0 && (
                    <div className="flex -space-x-1">
                      {emp.achievements.slice(0, 3).map(a => (
                        <span key={a.id} className="text-sm" title={a.name}>{a.icon}</span>
                      ))}
                      {emp.achievements.length > 3 && (
                        <span className="text-xs text-muted-foreground">+{emp.achievements.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-4">
              Os funcionários aparecerão automaticamente ao completar missões.
            </p>
          )}
        </div>
      </div>

      {/* Meus Pontos - se tiver funcionário selecionado */}
      {currentEmployee && (
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl border border-primary/20 p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-primary/20 flex items-center justify-center text-2xl">
                {currentEmployee.rank.icon}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Meus Pontos</p>
                <p className="text-3xl font-bold text-foreground">{currentEmployee.totalPoints}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn("px-2 py-0.5 rounded text-xs font-medium text-white", currentEmployee.rank.color)}>
                    {currentEmployee.rank.name}
                  </span>
                  {currentEmployee.nextRank && (
                    <span className="text-xs text-muted-foreground">
                      → {currentEmployee.nextRank.minPoints - currentEmployee.totalPoints} pts para {currentEmployee.nextRank.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              {/* Progress bar to next rank */}
              {currentEmployee.nextRank && (
                <div className="w-32">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${currentEmployee.progressToNext}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 text-center">{currentEmployee.progressToNext}%</p>
                </div>
              )}
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Minha Bonificação</p>
                <p className="text-2xl font-bold text-success">
                  R$ {currentEmployee.bonusValue.toFixed(2).replace('.', ',')}
                </p>
              </div>
            </div>
          </div>
          {/* Minhas Conquistas */}
          {currentEmployee.achievements.length > 0 && (
            <div className="mt-4 pt-4 border-t border-primary/20">
              <p className="text-sm font-medium text-foreground mb-2">Minhas Conquistas</p>
              <div className="flex gap-2 flex-wrap">
                {currentEmployee.achievements.map(a => (
                  <span key={a.id} className="px-3 py-1.5 bg-yellow-500/10 text-yellow-600 rounded-lg text-sm" title={a.description}>
                    {a.icon} {a.name}
                  </span>
                ))}
              </div>
            </div>
          )}
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
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
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
            const isAssignedToMe = mission.assigned_to === currentUserEmployeeId;

            return (
              <div 
                key={mission.id} 
                className={cn(
                  "bg-card rounded-xl border overflow-hidden transition-all hover:shadow-lg",
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
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
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
          {selectedEmployee ? (
            <>
              {/* Perfil do funcionário com patente */}
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                <div className={cn("w-16 h-16 rounded-xl flex items-center justify-center text-3xl", selectedEmployee.rank.color)}>
                  {selectedEmployee.rank.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground">{selectedEmployee.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className={cn("px-2 py-0.5 rounded text-xs font-medium text-white", selectedEmployee.rank.color)}>
                      {selectedEmployee.rank.name}
                    </span>
                    <span className="text-sm text-muted-foreground">{selectedEmployee.role}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-primary">{selectedEmployee.totalPoints}</p>
                  <p className="text-sm text-muted-foreground">pontos</p>
                </div>
              </div>

              {/* Progress to next rank */}
              {selectedEmployee.nextRank && (
                <div className="bg-muted/30 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">Progresso para {selectedEmployee.nextRank.name}</span>
                    <span className="text-sm font-medium">{selectedEmployee.progressToNext}%</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full transition-all", selectedEmployee.rank.color)}
                      style={{ width: `${selectedEmployee.progressToNext}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Faltam {selectedEmployee.nextRank.minPoints - selectedEmployee.totalPoints} pontos
                  </p>
                </div>
              )}

              {/* Conquistas */}
              {selectedEmployee.achievements.length > 0 && (
                <div>
                  <h4 className="font-semibold text-foreground mb-3">Conquistas Desbloqueadas</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedEmployee.achievements.map(a => (
                      <div key={a.id} className="flex items-center gap-2 p-2 bg-yellow-500/10 rounded-lg">
                        <span className="text-2xl">{a.icon}</span>
                        <div>
                          <p className="text-sm font-medium">{a.name}</p>
                          <p className="text-xs text-muted-foreground">{a.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
              {/* Resumo geral */}
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
                        <span className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white", emp.rank.color)}>
                          {emp.rank.icon}
                        </span>
                        <div>
                          <p className="font-medium text-sm">{emp.name}</p>
                          <p className="text-xs text-muted-foreground">{emp.rank.name} • {emp.completedCount} missões</p>
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
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Achievements Modal */}
      <Modal
        isOpen={isAchievementsModalOpen}
        onClose={() => setIsAchievementsModalOpen(false)}
        title="Conquistas Disponíveis"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">Complete missões para desbloquear conquistas e ganhar reconhecimento!</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ACHIEVEMENTS.map(achievement => {
              const isUnlocked = currentEmployee?.achievements.some(a => a.id === achievement.id);
              return (
                <div 
                  key={achievement.id}
                  className={cn(
                    "p-4 rounded-xl border transition-all",
                    isUnlocked 
                      ? "bg-yellow-500/10 border-yellow-500/30" 
                      : "bg-muted/30 border-border opacity-60"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{achievement.icon}</span>
                    <div>
                      <p className="font-semibold text-foreground">{achievement.name}</p>
                      <p className="text-sm text-muted-foreground">{achievement.description}</p>
                    </div>
                    {isUnlocked && (
                      <CheckCircle2 className="w-5 h-5 text-success ml-auto" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Patentes */}
          <div className="mt-6 pt-4 border-t border-border">
            <h4 className="font-semibold text-foreground mb-4">Sistema de Patentes</h4>
            <div className="space-y-2">
              {RANKS.map(rank => (
                <div key={rank.name} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-white text-xl", rank.color)}>
                      {rank.icon}
                    </span>
                    <span className="font-medium">{rank.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {rank.minPoints} - {rank.maxPoints === Infinity ? '∞' : rank.maxPoints} pontos
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
