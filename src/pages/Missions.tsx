import { useState } from 'react';
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
  Award
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
  const { data: missions, loading, create, update, remove } = useMissions();
  const { data: employees } = useEmployees();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'in_progress' | 'completed'>('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    points: 50,
    difficulty: 'medium' as Mission['difficulty'],
    category: 'daily' as Mission['category'],
    deadline: '',
  });

  // Calcular pontos por funcionário
  const employeePoints = employees.map(emp => {
    const completedMissions = missions.filter(
      m => m.completed_by === emp.id && m.status === 'completed'
    );
    const totalPoints = completedMissions.reduce((sum, m) => sum + m.points, 0);
    return { ...emp, totalPoints, completedCount: completedMissions.length };
  }).sort((a, b) => b.totalPoints - a.totalPoints);

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
    } catch (error) {
      toast.error('Erro ao salvar missão');
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
    await remove(id);
    toast.success('Missão excluída!');
  };

  const handleClaimMission = async (mission: Mission) => {
    // Encontrar o funcionário atual baseado no email do usuário
    const currentEmployee = employees.find(e => e.email === user?.email);
    if (!currentEmployee) {
      toast.error('Funcionário não encontrado');
      return;
    }

    await update(mission.id, {
      status: 'in_progress',
      assigned_to: currentEmployee.id,
    });
    toast.success('Missão iniciada! Boa sorte! 🚀');
  };

  const handleCompleteMission = async (mission: Mission) => {
    await update(mission.id, {
      status: 'completed',
      completed_by: mission.assigned_to,
      completed_at: new Date().toISOString(),
    });
    toast.success(`Missão concluída! +${mission.points} pontos 🎉`);
  };

  const handleCancelMission = async (mission: Mission) => {
    await update(mission.id, {
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
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
              <p className="text-xs text-muted-foreground">Pontos Distribuídos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <Trophy className="w-5 h-5 text-warning" />
          <h2 className="font-semibold text-card-foreground">Ranking de Pontos</h2>
        </div>
        <div className="p-4">
          <div className="flex gap-4 overflow-x-auto pb-2">
            {employeePoints.slice(0, 5).map((emp, index) => (
              <div 
                key={emp.id}
                className={cn(
                  "flex-shrink-0 flex items-center gap-3 p-3 rounded-lg min-w-[200px]",
                  index === 0 ? "bg-warning/10 border border-warning/30" :
                  index === 1 ? "bg-muted/80" :
                  index === 2 ? "bg-orange-500/10" : "bg-muted/50"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                  index === 0 ? "bg-warning text-warning-foreground" :
                  index === 1 ? "bg-gray-400 text-white" :
                  index === 2 ? "bg-orange-500 text-white" : "bg-muted-foreground/30 text-foreground"
                )}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{emp.name}</p>
                  <p className="text-xs text-muted-foreground">{emp.completedCount} missões</p>
                </div>
                <div className="flex items-center gap-1 text-primary font-bold">
                  <Star className="w-4 h-4 fill-primary" />
                  {emp.totalPoints}
                </div>
              </div>
            ))}
            {employeePoints.length === 0 && (
              <p className="text-muted-foreground text-sm">Nenhum funcionário cadastrado</p>
            )}
          </div>
        </div>
      </div>

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
          description="Crie uma nova missão para a equipe!"
          action={{
            label: 'Criar Missão',
            onClick: () => { resetForm(); setIsModalOpen(true); }
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMissions.map(mission => {
            const diffStyle = getDifficultyStyle(mission.difficulty);
            const currentEmployee = employees.find(e => e.email === user?.email);
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
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{mission.description}</p>

                  {mission.deadline && (
                    <p className="text-xs text-muted-foreground mb-3">
                      ⏰ Prazo: {format(new Date(mission.deadline), "dd 'de' MMM", { locale: ptBR })}
                    </p>
                  )}

                  {mission.status === 'in_progress' && (
                    <div className="flex items-center gap-2 mb-3 p-2 bg-warning/10 rounded-lg">
                      <User className="w-4 h-4 text-warning" />
                      <span className="text-sm text-warning">
                        {getEmployeeName(mission.assigned_to)}
                      </span>
                    </div>
                  )}

                  {mission.status === 'completed' && (
                    <div className="flex items-center gap-2 mb-3 p-2 bg-success/10 rounded-lg">
                      <Award className="w-4 h-4 text-success" />
                      <span className="text-sm text-success">
                        Concluída por {getEmployeeName(mission.completed_by)}
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
                      <span className="text-sm text-muted-foreground">Em andamento...</span>
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
    </div>
  );
}
