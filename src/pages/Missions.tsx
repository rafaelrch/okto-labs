import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Target, Trophy, Coins, Clock, CheckCircle2, User, Zap, Award, AlertTriangle, Calendar } from 'lucide-react';
import { useMissions, useEmployees, type Mission } from '@/hooks/useSupabaseData';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, isPast, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MissionsPageProps {
  searchQuery: string;
}

const priorityConfig = {
  low: { label: 'Baixa', color: 'bg-muted text-muted-foreground', points: '10-25' },
  medium: { label: 'Média', color: 'bg-warning/20 text-warning', points: '30-50' },
  high: { label: 'Alta', color: 'bg-orange-500/20 text-orange-500', points: '60-80' },
  urgent: { label: 'Urgente', color: 'bg-destructive/20 text-destructive', points: '100+' },
};

const statusConfig = {
  available: { label: 'Disponível', color: 'bg-primary/20 text-primary', icon: Target },
  in_progress: { label: 'Em Andamento', color: 'bg-warning/20 text-warning', icon: Clock },
  completed: { label: 'Concluída', color: 'bg-success/20 text-success', icon: CheckCircle2 },
  expired: { label: 'Expirada', color: 'bg-destructive/20 text-destructive', icon: AlertTriangle },
};

export function MissionsPage({ searchQuery }: MissionsPageProps) {
  const { data: missions, loading, create, update } = useMissions();
  const { data: employees } = useEmployees();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    points: 10,
    priority: 'medium' as Mission['priority'],
    deadline: '',
  });

  // Verificar missões expiradas automaticamente
  useEffect(() => {
    const checkExpiredMissions = async () => {
      const now = new Date();
      for (const mission of missions) {
        if (
          (mission.status === 'available' || mission.status === 'in_progress') &&
          mission.deadline &&
          isPast(new Date(mission.deadline))
        ) {
          await update(mission.id, { status: 'expired' });
        }
      }
    };
    if (missions.length > 0) {
      checkExpiredMissions();
    }
  }, [missions, update]);

  const filteredMissions = missions.filter(mission =>
    mission.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    mission.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const availableMissions = filteredMissions.filter(m => m.status === 'available');
  const inProgressMissions = filteredMissions.filter(m => m.status === 'in_progress');
  const completedMissions = filteredMissions.filter(m => m.status === 'completed');
  const expiredMissions = filteredMissions.filter(m => m.status === 'expired');

  // Calcular pontuação por funcionário
  const leaderboard = employees
    .map(emp => {
      const empMissions = missions.filter(m => m.assigned_to === emp.id && m.status === 'completed');
      const totalPoints = empMissions.reduce((sum, m) => sum + m.points, 0);
      return { ...emp, totalPoints, completedCount: empMissions.length };
    })
    .filter(emp => emp.totalPoints > 0)
    .sort((a, b) => b.totalPoints - a.totalPoints);

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }
    if (!formData.deadline) {
      toast.error('Prazo é obrigatório');
      return;
    }

    try {
      await create({
        title: formData.title,
        description: formData.description,
        points: formData.points,
        priority: formData.priority,
        deadline: formData.deadline,
        status: 'available',
        created_by: user?.id,
      });
      toast.success('Missão criada com sucesso!');
      setIsDialogOpen(false);
      setFormData({ title: '', description: '', points: 10, priority: 'medium', deadline: '' });
    } catch (error) {
      toast.error('Erro ao criar missão');
    }
  };

  const handleClaimMission = async (mission: Mission) => {
    try {
      await update(mission.id, {
        status: 'in_progress',
        assigned_to: user?.id,
        started_at: new Date().toISOString(),
      });
      toast.success('Você aceitou a missão! Boa sorte!');
    } catch (error) {
      toast.error('Erro ao aceitar missão');
    }
  };

  const handleCompleteMission = async (mission: Mission) => {
    try {
      await update(mission.id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
      toast.success(`Missão concluída! +${mission.points} pontos!`);
    } catch (error) {
      toast.error('Erro ao concluir missão');
    }
  };

  const getAssigneeName = (assignedTo?: string) => {
    if (!assignedTo) return null;
    const employee = employees.find(e => e.id === assignedTo);
    return employee?.name || 'Usuário';
  };

  const getTimeRemaining = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    if (isPast(deadlineDate)) {
      return { text: 'Expirado', isExpired: true };
    }
    return { 
      text: formatDistanceToNow(deadlineDate, { locale: ptBR, addSuffix: true }), 
      isExpired: false 
    };
  };

  const MissionCard = ({ mission, showActions = true }: { mission: Mission; showActions?: boolean }) => {
    const StatusIcon = statusConfig[mission.status].icon;
    const isMyMission = mission.assigned_to === user?.id;
    const timeRemaining = mission.deadline ? getTimeRemaining(mission.deadline) : null;

    return (
      <Card className={cn(
        'group hover:shadow-lg transition-all duration-300 border-2',
        mission.status === 'available' && 'border-primary/20 hover:border-primary/40',
        mission.status === 'in_progress' && 'border-warning/30',
        mission.status === 'completed' && 'border-success/30',
        mission.status === 'expired' && 'border-destructive/30 opacity-75'
      )}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <StatusIcon className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold text-foreground truncate">{mission.title}</h3>
              </div>
              {mission.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {mission.description}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={priorityConfig[mission.priority].color}>
                  {priorityConfig[mission.priority].label}
                </Badge>
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                  <Coins className="w-3 h-3 mr-1" />
                  {mission.points} pts
                </Badge>
                {timeRemaining && mission.status !== 'completed' && (
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs",
                      timeRemaining.isExpired ? "border-destructive text-destructive" : "border-muted-foreground"
                    )}
                  >
                    <Calendar className="w-3 h-3 mr-1" />
                    {timeRemaining.text}
                  </Badge>
                )}
                {mission.assigned_to && (
                  <Badge variant="outline" className="text-xs">
                    <User className="w-3 h-3 mr-1" />
                    {getAssigneeName(mission.assigned_to)}
                  </Badge>
                )}
              </div>
            </div>
            {showActions && mission.status !== 'expired' && (
              <div className="flex flex-col gap-2">
                {mission.status === 'available' && (
                  <Button
                    size="sm"
                    onClick={() => handleClaimMission(mission)}
                    className="btn-primary-gradient"
                  >
                    <Zap className="w-4 h-4 mr-1" />
                    Aceitar
                  </Button>
                )}
                {mission.status === 'in_progress' && isMyMission && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCompleteMission(mission)}
                    className="border-success text-success hover:bg-success/10"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Concluir
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const LeaderboardCard = () => (
    <Card className="border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5 h-fit sticky top-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="w-5 h-5 text-amber-500" />
          Ranking
        </CardTitle>
      </CardHeader>
      <CardContent>
        {leaderboard.length === 0 ? (
          <p className="text-muted-foreground text-center py-4 text-sm">
            Nenhum ponto ainda
          </p>
        ) : (
          <div className="space-y-2">
            {leaderboard.slice(0, 10).map((emp, index) => (
              <div
                key={emp.id}
                className={cn(
                  'flex items-center gap-3 p-2 rounded-lg',
                  index === 0 && 'bg-amber-500/10 border border-amber-500/30',
                  index === 1 && 'bg-gray-300/10 border border-gray-300/30',
                  index === 2 && 'bg-orange-700/10 border border-orange-700/30',
                  index > 2 && 'bg-muted/50'
                )}
              >
                <div className="w-6 h-6 rounded-full flex items-center justify-center">
                  {index === 0 && <Award className="w-5 h-5 text-amber-500" />}
                  {index === 1 && <Award className="w-5 h-5 text-gray-400" />}
                  {index === 2 && <Award className="w-5 h-5 text-orange-700" />}
                  {index > 2 && <span className="text-xs text-muted-foreground">{index + 1}º</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">{emp.name}</p>
                  <p className="text-xs text-muted-foreground">{emp.completedCount} missões</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-amber-500">{emp.totalPoints}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Main Content */}
      <div className="flex-1 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Missões</h1>
            <p className="text-muted-foreground">Complete missões para ganhar pontos e bonificações</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-primary-gradient">
                <Plus className="w-4 h-4 mr-2" />
                Nova Missão
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Criar Nova Missão</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    placeholder="Ex: Organizar arquivos do servidor"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    placeholder="Descreva a missão..."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prazo</Label>
                  <Input
                    type="datetime-local"
                    value={formData.deadline}
                    onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Pontuação</Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.points}
                      onChange={(e) => setFormData(prev => ({ ...prev, points: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Prioridade</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as Mission['priority'] }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleSubmit} className="w-full btn-primary-gradient">
                  Criar Missão
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{availableMissions.length}</p>
                <p className="text-xs text-muted-foreground">Disponíveis</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/20">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{inProgressMissions.length}</p>
                <p className="text-xs text-muted-foreground">Em Andamento</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/20">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{completedMissions.length}</p>
                <p className="text-xs text-muted-foreground">Concluídas</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/20">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{expiredMissions.length}</p>
                <p className="text-xs text-muted-foreground">Expiradas</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mission Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Available */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">Disponíveis</h2>
              <Badge variant="outline">{availableMissions.length}</Badge>
            </div>
            <div className="space-y-3">
              {availableMissions.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center text-muted-foreground">
                    <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma missão disponível</p>
                  </CardContent>
                </Card>
              ) : (
                availableMissions.map(mission => (
                  <MissionCard key={mission.id} mission={mission} />
                ))
              )}
            </div>
          </div>

          {/* In Progress */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-warning" />
              <h2 className="font-semibold text-foreground">Em Andamento</h2>
              <Badge variant="outline">{inProgressMissions.length}</Badge>
            </div>
            <div className="space-y-3">
              {inProgressMissions.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center text-muted-foreground">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma missão em andamento</p>
                  </CardContent>
                </Card>
              ) : (
                inProgressMissions.map(mission => (
                  <MissionCard key={mission.id} mission={mission} />
                ))
              )}
            </div>
          </div>

          {/* Completed */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-success" />
              <h2 className="font-semibold text-foreground">Concluídas</h2>
              <Badge variant="outline">{completedMissions.length}</Badge>
            </div>
            <div className="space-y-3">
              {completedMissions.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center text-muted-foreground">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma missão concluída</p>
                  </CardContent>
                </Card>
              ) : (
                completedMissions.map(mission => (
                  <MissionCard key={mission.id} mission={mission} showActions={false} />
                ))
              )}
            </div>
          </div>

          {/* Expired */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <h2 className="font-semibold text-foreground">Expiradas</h2>
              <Badge variant="outline">{expiredMissions.length}</Badge>
            </div>
            <div className="space-y-3">
              {expiredMissions.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center text-muted-foreground">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma missão expirada</p>
                  </CardContent>
                </Card>
              ) : (
                expiredMissions.map(mission => (
                  <MissionCard key={mission.id} mission={mission} showActions={false} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Leaderboard */}
      <div className="hidden xl:block w-72">
        <LeaderboardCard />
      </div>
    </div>
  );
}
