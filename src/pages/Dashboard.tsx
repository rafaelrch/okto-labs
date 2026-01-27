import { 
  Users, 
  FileCheck, 
  Clock,
  Calendar, 
  TrendingUp, 
  ArrowRight,
  CheckSquare,
  Image as ImageIcon,
  Loader2,
  Trophy,
  Award,
  Circle,
  CheckCircle2,
  XCircle,
  PlayCircle,
  BarChart3
} from 'lucide-react';
import { useClients, useContents, useTasks, useEmployees, useMissions, Task, Content } from '@/hooks/useSupabaseData';
import { StatusBadge } from '@/components/ui/status-badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format, subDays, startOfDay, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, addWeeks, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Modal } from '@/components/ui/modal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';

// Helper para parsear datas YYYY-MM-DD como data local
const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// Tipos de filtro de data
type DateFilterType = 'today' | 'thisWeek' | 'nextWeek' | 'thisMonth' | 'nextMonth' | 'thisYear' | 'last7Days';

// Helper para calcular período baseado no filtro
const getDateRange = (filter: DateFilterType): { startDate: string; endDate: string } => {
  const now = new Date();
  const today = startOfDay(now);
  
  switch (filter) {
    case 'today': {
      const start = format(today, 'yyyy-MM-dd');
      return { startDate: start, endDate: start };
    }
    case 'thisWeek': {
      const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Segunda-feira
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
      return {
        startDate: format(weekStart, 'yyyy-MM-dd'),
        endDate: format(weekEnd, 'yyyy-MM-dd'),
      };
    }
    case 'nextWeek': {
      const nextWeekStart = startOfWeek(addWeeks(today, 1), { weekStartsOn: 1 });
      const nextWeekEnd = endOfWeek(addWeeks(today, 1), { weekStartsOn: 1 });
      return {
        startDate: format(nextWeekStart, 'yyyy-MM-dd'),
        endDate: format(nextWeekEnd, 'yyyy-MM-dd'),
      };
    }
    case 'thisMonth': {
      const monthStart = startOfMonth(today);
      const monthEnd = endOfMonth(today);
      return {
        startDate: format(monthStart, 'yyyy-MM-dd'),
        endDate: format(monthEnd, 'yyyy-MM-dd'),
      };
    }
    case 'nextMonth': {
      const nextMonthStart = startOfMonth(addMonths(today, 1));
      const nextMonthEnd = endOfMonth(addMonths(today, 1));
      return {
        startDate: format(nextMonthStart, 'yyyy-MM-dd'),
        endDate: format(nextMonthEnd, 'yyyy-MM-dd'),
      };
    }
    case 'thisYear': {
      const yearStart = startOfYear(today);
      const yearEnd = endOfYear(today);
      return {
        startDate: format(yearStart, 'yyyy-MM-dd'),
        endDate: format(yearEnd, 'yyyy-MM-dd'),
      };
    }
    case 'last7Days': {
      const sevenDaysAgo = subDays(today, 6); // Inclui hoje (7 dias no total)
      return {
        startDate: format(sevenDaysAgo, 'yyyy-MM-dd'),
        endDate: format(today, 'yyyy-MM-dd'),
      };
    }
    default:
      return { startDate: format(today, 'yyyy-MM-dd'), endDate: format(today, 'yyyy-MM-dd') };
  }
};

// Status de tarefas
const taskStatuses = [
  { value: 'pending', label: 'Pendente', icon: Circle, color: 'text-gray-500' },
  { value: 'in_progress', label: 'Em Andamento', icon: PlayCircle, color: 'text-blue-500' },
  { value: 'completed', label: 'Concluída', icon: CheckCircle2, color: 'text-green-500' },
  { value: 'cancelled', label: 'Cancelada', icon: XCircle, color: 'text-red-500' },
];

interface DashboardProps {
  onNavigate: (page: string) => void;
}

interface MetricCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  onClick?: () => void;
}

function MetricCard({ title, value, icon: Icon, color, onClick }: MetricCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-card rounded-xl border border-border p-6 card-hover text-left w-full"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-3xl font-bold text-card-foreground">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </button>
  );
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { data: clients, loading: loadingClients } = useClients();
  const { data: contents, loading: loadingContents } = useContents();
  const { data: tasks, loading: loadingTasks, update: updateTask } = useTasks();
  const { data: employees, loading: loadingEmployees } = useEmployees();
  const { data: missions, loading: loadingMissions } = useMissions();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [chartTimeRange, setChartTimeRange] = useState("30d");
  const [dateFilter, setDateFilter] = useState<DateFilterType>('today');

  // Configuração do gráfico de status de conteúdos
  const contentStatusChartConfig: ChartConfig = {
    draft: {
      label: "Não Iniciado",
      color: "#6b7280", // gray
    },
    production: {
      label: "Em Produção",
      color: "#8b5cf6", // purple
    },
    pending: {
      label: "Em Aprovação",
      color: "#f59e0b", // yellow/amber
    },
    approved: {
      label: "Aprovado",
      color: "#22c55e", // green
    },
    rejected: {
      label: "Reprovado",
      color: "#ef4444", // red
    },
  };

  // Dados do gráfico de área para evolução de conteúdos ao longo do tempo
  const contentAreaChartData = useMemo(() => {
    const daysToShow = chartTimeRange === "7d" ? 7 : chartTimeRange === "30d" ? 30 : 90;
    const today = startOfDay(new Date());
    
    // Criar array de datas
    const dateRange: Date[] = [];
    for (let i = daysToShow - 1; i >= 0; i--) {
      dateRange.push(subDays(today, i));
    }

    // Agrupar conteúdos por data de criação e status
    return dateRange.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const contentsUpToDate = contents.filter(c => {
        const createdDate = c.created_at ? format(parseISO(c.created_at), 'yyyy-MM-dd') : null;
        return createdDate && createdDate <= dateStr;
      });

      return {
        date: dateStr,
        draft: contentsUpToDate.filter(c => c.status === 'draft').length,
        production: contentsUpToDate.filter(c => c.status === 'production').length,
        pending: contentsUpToDate.filter(c => c.status === 'pending').length,
        approved: contentsUpToDate.filter(c => c.status === 'approved').length,
        rejected: contentsUpToDate.filter(c => c.status === 'rejected').length,
      };
    });
  }, [contents, chartTimeRange]);

  // Função para alterar status da tarefa
  const handleTaskStatusChange = async (taskId: string, newStatus: Task['status']) => {
    try {
      await updateTask(taskId, { status: newStatus });
      const statusLabel = taskStatuses.find(s => s.value === newStatus)?.label;
      toast.success(`Status alterado para ${statusLabel}`);
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const loading = loadingClients || loadingContents || loadingTasks || loadingEmployees || loadingMissions;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Métricas
  const activeClients = clients.filter(c => c.status === 'active').length;
  // Calcular período baseado no filtro selecionado
  const dateRange = getDateRange(dateFilter);
  const { startDate, endDate } = dateRange;
  
  // Filtrar dados baseado no período selecionado
  const filteredContents = contents.filter(c => {
    if (!c.publish_date) return false;
    return c.publish_date >= startDate && c.publish_date <= endDate;
  });
  
  const filteredTasks = tasks.filter(t => {
    if (!t.due_date) return false;
    return t.due_date >= startDate && t.due_date <= endDate;
  });
  
  const readyContents = filteredContents.filter(c => c.status === 'approved').length;
  const pendingApprovals = filteredContents.filter(c => c.status === 'pending').length;
  const todayPosts = filteredContents.length;
  const allTodayTasks = filteredTasks; // Incluir todas as tarefas (incluindo concluídas)
  
  // Filtrar tarefas por funcionário selecionado
  const todayTasks = selectedEmployeeId
    ? allTodayTasks.filter(t => t.responsible_id === selectedEmployeeId)
    : allTodayTasks;

  // Ordenar: pendentes primeiro, concluídas por último
  const sortedTodayTasks = [...todayTasks].sort((a, b) => {
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    if (a.status !== 'completed' && b.status === 'completed') return -1;
    return 0;
  });

  // Funcionários que têm tarefas hoje
  const employeesWithTodayTasks = employees.filter(emp => 
    allTodayTasks.some(t => t.responsible_id === emp.id)
  );

  // Próximas publicações (aprovados para postar no período selecionado)
  const upcomingPublications = filteredContents
    .filter(c => c.status === 'approved')
    .sort((a, b) => {
      const dateCompare = (a.publish_date || '').localeCompare(b.publish_date || '');
      if (dateCompare !== 0) return dateCompare;
      return a.publish_time.localeCompare(b.publish_time);
    });

  // Calcular ranking de pontuações das missões
  const leaderboard = employees
    .map(emp => {
      const empMissions = missions.filter(m => m.assigned_to === emp.user_id && m.status === 'completed');
      const totalPoints = empMissions.reduce((sum, m) => sum + m.points, 0);
      return { ...emp, totalPoints, completedCount: empMissions.length };
    })
    .filter(emp => emp.totalPoints > 0)
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, 5); // Top 5

  // Labels para o filtro de data
  const dateFilterLabels: Record<DateFilterType, string> = {
    today: 'Hoje',
    thisWeek: 'Esta Semana',
    nextWeek: 'Semana que Vem',
    thisMonth: 'Este Mês',
    nextMonth: 'Mês que Vem',
    thisYear: 'Este Ano',
    last7Days: 'Últimos 7 Dias',
  };

  return (
    <div className="space-y-6">
      {/* Filtro de Data */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-card-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visualize os dados do período selecionado
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateFilter} onValueChange={(value) => setDateFilter(value as DateFilterType)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">{dateFilterLabels.today}</SelectItem>
              <SelectItem value="thisWeek">{dateFilterLabels.thisWeek}</SelectItem>
              <SelectItem value="nextWeek">{dateFilterLabels.nextWeek}</SelectItem>
              <SelectItem value="thisMonth">{dateFilterLabels.thisMonth}</SelectItem>
              <SelectItem value="nextMonth">{dateFilterLabels.nextMonth}</SelectItem>
              <SelectItem value="thisYear">{dateFilterLabels.thisYear}</SelectItem>
              <SelectItem value="last7Days">{dateFilterLabels.last7Days}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Clientes Ativos"
          value={activeClients}
          icon={Users}
          color="bg-primary/10 text-primary"
          onClick={() => onNavigate('clients')}
        />
        <MetricCard
          title="Conteúdos Prontos"
          value={readyContents}
          icon={FileCheck}
          color="bg-success/10 text-success"
          onClick={() => onNavigate('schedule')}
        />
        <MetricCard
          title="Aguardando Aprovação"
          value={pendingApprovals}
          icon={Clock}
          color="bg-warning/10 text-warning"
          onClick={() => onNavigate('approvals')}
        />
        <MetricCard
          title={`Posts - ${dateFilterLabels[dateFilter]}`}
          value={todayPosts}
          icon={Calendar}
          color="bg-info/10 text-info"
          onClick={() => onNavigate('calendar')}
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left side - Two cards */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Tasks */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-muted-foreground" />
                <h2 className="font-semibold text-card-foreground">Tarefas - {dateFilterLabels[dateFilter]}</h2>
              </div>
              <button 
                onClick={() => onNavigate('tasks')}
                className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
              >
                Ver todas <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            
            {/* Employee Filter Tabs */}
            {employeesWithTodayTasks.length > 0 && (
              <div className="px-4 pt-4 flex gap-2 flex-wrap">
                <button
                  onClick={() => setSelectedEmployeeId(null)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    selectedEmployeeId === null
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  Todos
                </button>
                {employeesWithTodayTasks.map(emp => (
                  <button
                    key={emp.id}
                    onClick={() => setSelectedEmployeeId(emp.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      selectedEmployeeId === emp.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {emp.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            )}

            <div className="p-4 space-y-3">
              {sortedTodayTasks.slice(0, 6).map(task => {
                const currentStatus = taskStatuses.find(s => s.value === task.status);
                const StatusIcon = currentStatus?.icon || Circle;
                const isCompleted = task.status === 'completed';
                return (
                  <div 
                    key={task.id} 
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg hover:bg-muted/80 transition-colors cursor-pointer",
                      isCompleted ? "bg-green-500/5 opacity-70" : "bg-muted/50"
                    )}
                    onClick={() => setSelectedTask(task)}
                  >
                    {/* Status Icon Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <button className={cn("p-1 rounded hover:bg-muted transition-colors", currentStatus?.color)}>
                          <StatusIcon className="w-5 h-5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {taskStatuses.map(status => {
                          const Icon = status.icon;
                          return (
                            <DropdownMenuItem 
                              key={status.value}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTaskStatusChange(task.id, status.value as Task['status']);
                              }}
                              className="flex items-center gap-2"
                            >
                              <Icon className={cn("w-4 h-4", status.color)} />
                              {status.label}
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "font-medium text-sm truncate",
                        isCompleted ? "text-muted-foreground line-through" : "text-card-foreground"
                      )}>{task.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{task.description}</p>
                    </div>
                    <StatusBadge status={task.priority} type="priority" />
                  </div>
                );
              })}
              {sortedTodayTasks.length === 0 && (
                <p className="text-center text-muted-foreground py-4 text-sm">
                  Nenhuma tarefa para {dateFilterLabels[dateFilter].toLowerCase()} 🎉
                </p>
              )}
            </div>
          </div>

          {/* Upcoming Publications */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-muted-foreground" />
                <h2 className="font-semibold text-card-foreground">Publicações - {dateFilterLabels[dateFilter]}</h2>
              </div>
              <button 
                onClick={() => onNavigate('calendar')}
                className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
              >
                Ver calendário <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {upcomingPublications.slice(0, 5).map(content => {
                const client = clients.find(c => c.id === content.client_id);
                const hasPreview = content.finalized_files && content.finalized_files.length > 0;
                const previewUrl = hasPreview ? content.finalized_files![0] : null;
                const isImage = previewUrl && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(previewUrl);
                
                return (
                  <div 
                    key={content.id} 
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted/80 transition-colors cursor-pointer"
                    onClick={() => setSelectedContent(content)}
                  >
                    {/* Preview Square */}
                    {isImage && previewUrl ? (
                      <img 
                        src={previewUrl} 
                        alt={content.title}
                        className="w-12 h-12 rounded-lg flex-shrink-0 object-cover"
                      />
                    ) : (
                      <div 
                        className="w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center"
                        style={{ backgroundColor: client?.color || '#3B82F6' }}
                      >
                        <ImageIcon className="w-5 h-5 text-white/80" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-card-foreground truncate">{content.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {client?.name} • {content.publish_date && format(parseLocalDate(content.publish_date), "dd 'de' MMM", { locale: ptBR })} às {content.publish_time}
                      </p>
                    </div>
                    <StatusBadge status={content.status} type="content" />
                  </div>
                );
              })}
              {upcomingPublications.length === 0 && (
                <p className="text-center text-muted-foreground py-4 text-sm">
                  Nenhuma publicação agendada
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right side - Ranking de Missões */}
        <div className="lg:w-80 flex-shrink-0">
          <Card className="border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5 h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Trophy className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  Ranking Missões
                </CardTitle>
                <button 
                  onClick={() => onNavigate('missions')}
                  className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                >
                  Ver todas <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {leaderboard.length === 0 ? (
                <p className="text-muted-foreground text-center py-4 text-sm">
                  Nenhum ponto ainda
                </p>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((emp, index) => (
                    <div
                      key={emp.id}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded-lg',
                        index === 0 && 'bg-amber-500/10 border border-amber-500/30',
                        index === 1 && 'bg-gray-300/10 border border-gray-300/30',
                        index === 2 && 'bg-orange-700/10 border border-orange-700/30',
                        index > 2 && 'bg-muted/50'
                      )}
                    >
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                        {index === 0 && <Award className="w-4 h-4 text-amber-500" />}
                        {index === 1 && <Award className="w-4 h-4 text-gray-400" />}
                        {index === 2 && <Award className="w-4 h-4 text-orange-700" />}
                        {index > 2 && <span className="text-xs text-muted-foreground">{index + 1}º</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-xs truncate">{emp.name}</p>
                        <p className="text-xs text-muted-foreground">{emp.completedCount} missões</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-amber-500 text-sm">{emp.totalPoints}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Area Chart - Evolução de Conteúdos */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
            <div className="grid flex-1 gap-1">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-muted-foreground" />
                Evolução de Conteúdos
              </CardTitle>
              <CardDescription>
                Quantidade de conteúdos por status ao longo do tempo
              </CardDescription>
            </div>
            <Select value={chartTimeRange} onValueChange={setChartTimeRange}>
              <SelectTrigger
                className="w-[140px] rounded-lg"
                aria-label="Selecionar período"
              >
                <SelectValue placeholder="Último mês" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="90d" className="rounded-lg">
                  Últimos 3 meses
                </SelectItem>
                <SelectItem value="30d" className="rounded-lg">
                  Últimos 30 dias
                </SelectItem>
                <SelectItem value="7d" className="rounded-lg">
                  Últimos 7 dias
                </SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
            <ChartContainer
              config={contentStatusChartConfig}
              className="aspect-auto h-[280px] w-full"
            >
              <AreaChart data={contentAreaChartData}>
                <defs>
                  <linearGradient id="fillDraft" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6b7280" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#6b7280" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="fillProduction" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="fillPending" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="fillApproved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="fillRejected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  tickFormatter={(value) => {
                    // Usar parseLocalDate para evitar problema de timezone
                    const date = parseLocalDate(value);
                    return date.toLocaleDateString("pt-BR", {
                      month: "short",
                      day: "numeric",
                    });
                  }}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => {
                        // Usar parseLocalDate para evitar problema de timezone
                        return parseLocalDate(value).toLocaleDateString("pt-BR", {
                          month: "short",
                          day: "numeric",
                        });
                      }}
                      indicator="dot"
                    />
                  }
                />
                <Area
                  dataKey="approved"
                  type="monotone"
                  fill="url(#fillApproved)"
                  stroke="#22c55e"
                  stackId="a"
                />
                <Area
                  dataKey="pending"
                  type="monotone"
                  fill="url(#fillPending)"
                  stroke="#f59e0b"
                  stackId="a"
                />
                <Area
                  dataKey="production"
                  type="monotone"
                  fill="url(#fillProduction)"
                  stroke="#8b5cf6"
                  stackId="a"
                />
                <Area
                  dataKey="draft"
                  type="monotone"
                  fill="url(#fillDraft)"
                  stroke="#6b7280"
                  stackId="a"
                />
                <Area
                  dataKey="rejected"
                  type="monotone"
                  fill="url(#fillRejected)"
                  stroke="#ef4444"
                  stackId="a"
                />
                <ChartLegend content={<ChartLegendContent />} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Gauge Chart - Performance de Aprovações */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Performance</CardTitle>
              <button className="p-1 hover:bg-muted rounded-full transition-colors">
                <svg className="w-5 h-5 text-muted-foreground" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="5" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="19" r="2" />
                </svg>
              </button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center pb-6">
            {(() => {
              // Calcular porcentagem de conteúdos aprovados (todos os conteúdos agendados no período)
              const scheduledContents = filteredContents.filter(c => c.publish_date);
              const approvedContents = scheduledContents.filter(c => c.status === 'approved').length;
              const percentage = scheduledContents.length > 0 
                ? Math.round((approvedContents / scheduledContents.length) * 100 * 10) / 10
                : 0;
              
              // Configuração do gauge - arco simples com bordas arredondadas
              const radius = 80;
              const strokeWidth = 14;
              const circumference = Math.PI * radius; // semi-círculo
              const filledLength = (percentage / 100) * circumference;
              const unfilledLength = circumference - filledLength;
              
              return (
                <>
                  {/* Badge de performance */}
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full mb-4">
                    <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    <span className="text-sm text-muted-foreground">
                      {scheduledContents.length > 0 ? (
                        <><span className="text-primary font-medium">{percentage}%</span> dos conteúdos aprovados</>
                      ) : (
                        <>Nenhum conteúdo agendado</>
                      )}
                    </span>
                  </div>
                  
                  {/* Gauge SVG - Arco simples com bordas arredondadas */}
                  <div className="relative mb-4">
                    <svg width="200" height="110" viewBox="0 0 200 110">
                      {/* Arco de fundo (cinza) */}
                      <path
                        d={`M ${20} ${100} A ${radius} ${radius} 0 0 1 ${180} ${100}`}
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                      />
                      {/* Arco preenchido (azul) */}
                      {percentage > 0 && (
                        <path
                          d={`M ${20} ${100} A ${radius} ${radius} 0 0 1 ${180} ${100}`}
                          fill="none"
                          stroke="#6366f1"
                          strokeWidth={strokeWidth}
                          strokeLinecap="round"
                          strokeDasharray={`${filledLength} ${unfilledLength}`}
                        />
                      )}
                    </svg>
                    
                    {/* Percentage text */}
                    <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
                      <span className="text-3xl font-bold text-foreground">{percentage}%</span>
                      <span className="text-xs text-muted-foreground">Aprovados</span>
                    </div>
                  </div>
                  
                  {/* Stats */}
                  <div className="w-full mt-4 pt-4 border-t border-border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Total de conteúdos</p>
                        <p className="text-2xl font-bold text-foreground">{scheduledContents.length}</p>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-600 text-xs font-medium rounded-full">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                          </svg>
                          {approvedContents} aprovados
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Task Detail Modal */}
      <Modal
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        title="Detalhes da Tarefa"
      >
        {selectedTask && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">{selectedTask.title}</h3>
              {selectedTask.description && (
                <p className="text-muted-foreground text-sm mt-1">{selectedTask.description}</p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Status</p>
                <div className="flex items-center gap-2">
                  {(() => {
                    const status = taskStatuses.find(s => s.value === selectedTask.status);
                    const Icon = status?.icon || Circle;
                    return (
                      <>
                        <Icon className={cn("w-4 h-4", status?.color)} />
                        <span className="text-sm">{status?.label}</span>
                      </>
                    );
                  })()}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Prioridade</p>
                <StatusBadge status={selectedTask.priority} type="priority" />
              </div>
            </div>

            {selectedTask.due_date && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Data de Entrega</p>
                <p className="text-sm">{format(parseLocalDate(selectedTask.due_date), "dd 'de' MMMM, yyyy", { locale: ptBR })}</p>
              </div>
            )}

            {selectedTask.responsible_id && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Responsável</p>
                <p className="text-sm">{employees.find(e => e.id === selectedTask.responsible_id)?.name || 'Não definido'}</p>
              </div>
            )}

            <div className="flex gap-2 pt-4 border-t border-border">
              {taskStatuses.map(status => {
                const Icon = status.icon;
                const isActive = selectedTask.status === status.value;
                return (
                  <button
                    key={status.value}
                    onClick={() => {
                      handleTaskStatusChange(selectedTask.id, status.value as Task['status']);
                      setSelectedTask({ ...selectedTask, status: status.value as Task['status'] });
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                      isActive 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {status.label}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => {
                setSelectedTask(null);
                onNavigate('tasks');
              }}
              className="w-full py-2 text-sm text-primary hover:text-primary/80 flex items-center justify-center gap-1"
            >
              Ver na página de tarefas <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </Modal>

      {/* Content Detail Modal - Estilo Calendário */}
      {selectedContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2">
          <div
            className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
            onClick={() => setSelectedContent(null)}
          />
          <div className="relative w-full max-w-5xl bg-card rounded-2xl shadow-xl border border-border animate-scale-in overflow-hidden">
            {/* Content - 2 Columns */}
            <div className="flex p-2 gap-2 max-h-[80vh]">
              {/* Coluna Esquerda - Material Finalizado */}
              <div className="flex-1 bg-muted/30 rounded-xl flex flex-col min-h-[400px] overflow-hidden relative">
                {selectedContent.finalized_files && selectedContent.finalized_files.length > 0 ? (
                  <>
                    {/* Área do arquivo */}
                    <div className="flex-1 flex items-center justify-center p-4 relative">
                      {(() => {
                        const file = selectedContent.finalized_files![0];
                        const isImg = /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(file);
                        const isVid = /\.(mp4|mov|avi|webm|mkv)$/i.test(file);
                        
                        if (isImg) {
                          return (
                            <img
                              src={file}
                              alt="Material finalizado"
                              className="max-w-full max-h-[65vh] object-contain rounded-lg"
                            />
                          );
                        } else if (isVid) {
                          return (
                            <video
                              src={file}
                              controls
                              className="max-w-full max-h-[65vh] object-contain rounded-lg"
                            />
                          );
                        } else {
                          return (
                            <div className="flex flex-col items-center gap-3 p-6 bg-white rounded-xl">
                              <ImageIcon className="w-16 h-16 text-muted-foreground" />
                              <span className="text-sm text-foreground truncate max-w-[200px]">
                                {file.split('/').pop()?.split('?')[0]}
                              </span>
                            </div>
                          );
                        }
                      })()}
                    </div>
                    
                    {/* Barra inferior - Download */}
                    <div className="flex items-center justify-end px-4 py-3 bg-white/50">
                      <button
                        onClick={async () => {
                          const file = selectedContent.finalized_files![0];
                          try {
                            const response = await fetch(file);
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = file.split('/').pop()?.split('?')[0] || 'download';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            window.URL.revokeObjectURL(url);
                            toast.success('Download iniciado!');
                          } catch (error) {
                            toast.error('Erro ao fazer download');
                          }
                        }}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                        title="Baixar arquivo"
                      >
                        <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center p-8">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground">Nenhum material finalizado</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Coluna Direita - Informações */}
              <div className="w-[380px] flex-shrink-0 overflow-y-auto p-4 space-y-5">
                {/* Header com X */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-1">{selectedContent.title}</h3>
                    <p className="text-sm text-muted-foreground">{clients.find(c => c.id === selectedContent.client_id)?.name || 'Cliente'}</p>
                  </div>
                  <button
                    onClick={() => setSelectedContent(null)}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors flex-shrink-0"
                  >
                    <XCircle className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
                
                {/* Status */}
                <div>
                  <StatusBadge status={selectedContent.status} type="content" />
                </div>
                
                {/* Briefing */}
                {selectedContent.description && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Briefing</p>
                    <p className="text-sm bg-muted/50 p-3 rounded-lg">{selectedContent.description}</p>
                  </div>
                )}
                
                {/* Data e Horário */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Data de Publicação</p>
                    <p className="text-sm font-medium">
                      {selectedContent.publish_date 
                        ? format(parseLocalDate(selectedContent.publish_date), "dd 'de' MMMM, yyyy", { locale: ptBR })
                        : 'Não definida'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Horário</p>
                    <p className="text-sm font-medium">{selectedContent.publish_time || 'Não definido'}</p>
                  </div>
                </div>
                
                {/* Rede Social e Tipo */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Rede Social</p>
                    <div className="flex items-center gap-2">
                      {selectedContent.social_network === 'instagram' && (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                        </svg>
                      )}
                      {selectedContent.social_network === 'facebook' && (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                      )}
                      {selectedContent.social_network === 'tiktok' && (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                        </svg>
                      )}
                      {selectedContent.social_network === 'linkedin' && (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                      )}
                      <p className="text-sm font-medium capitalize">{selectedContent.social_network}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Tipo</p>
                    <p className="text-sm font-medium capitalize">{selectedContent.type}</p>
                  </div>
                </div>
                
                {/* Legenda */}
                {selectedContent.copy && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-muted-foreground">Legenda</p>
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(selectedContent.copy);
                            toast.success('Legenda copiada!');
                          } catch {
                            toast.error('Erro ao copiar');
                          }
                        }}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                        title="Copiar legenda"
                      >
                        <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-sm bg-muted/50 p-3 rounded-lg whitespace-pre-wrap">{selectedContent.copy}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
