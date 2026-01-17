import { useEffect, useState } from 'react';
import { 
  Users, 
  FileCheck, 
  Clock,
  Calendar, 
  TrendingUp, 
  ArrowRight,
  CheckSquare
} from 'lucide-react';
import { getFromStorage, Client, Content, Task } from '@/lib/storage';
import { StatusBadge } from '@/components/ui/status-badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  const [clients, setClients] = useState<Client[]>([]);
  const [contents, setContents] = useState<Content[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    setClients(getFromStorage<Client>('clients'));
    setContents(getFromStorage<Content>('contents'));
    setTasks(getFromStorage<Task>('tasks'));
  }, []);

  // Métricas
  const activeClients = clients.filter(c => c.status === 'active').length;
  const readyContents = contents.filter(c => c.status === 'approved').length;
  const pendingApprovals = contents.filter(c => c.status === 'pending').length;
  
  const today = new Date().toISOString().split('T')[0];
  const todayPosts = contents.filter(c => c.publishDate === today).length;
  const todayTasks = tasks.filter(t => t.dueDate === today && t.status !== 'completed');

  // Próximas publicações (aprovados para postar)
  const upcomingPublications = contents
    .filter(c => c.status === 'approved' && c.publishDate >= today)
    .sort((a, b) => {
      const dateCompare = a.publishDate.localeCompare(b.publishDate);
      if (dateCompare !== 0) return dateCompare;
      return a.publishTime.localeCompare(b.publishTime);
    });

  return (
    <div className="space-y-6">
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
          title="Posts de Hoje"
          value={todayPosts}
          icon={Calendar}
          color="bg-info/10 text-info"
          onClick={() => onNavigate('calendar')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Tasks */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-muted-foreground" />
              <h2 className="font-semibold text-card-foreground">Tarefas de Hoje</h2>
            </div>
            <button 
              onClick={() => onNavigate('tasks')}
              className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
            >
              Ver todas <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 space-y-3">
            {todayTasks.slice(0, 5).map(task => (
              <div key={task.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-card-foreground truncate">{task.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{task.description}</p>
                </div>
                <StatusBadge status={task.priority} type="priority" />
              </div>
            ))}
            {todayTasks.length === 0 && (
              <p className="text-center text-muted-foreground py-4 text-sm">
                Nenhuma tarefa pendente para hoje 🎉
              </p>
            )}
          </div>
        </div>

        {/* Upcoming Publications */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-muted-foreground" />
              <h2 className="font-semibold text-card-foreground">Próximas Publicações</h2>
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
              const client = clients.find(c => c.id === content.clientId);
              return (
                <div key={content.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div
                    className="w-1.5 h-12 rounded-full flex-shrink-0"
                    style={{ backgroundColor: client?.color || '#3B82F6' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-card-foreground truncate">{content.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {client?.name} • {format(new Date(content.publishDate), "dd 'de' MMM", { locale: ptBR })} às {content.publishTime}
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

      {/* Quick Actions */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="font-semibold text-card-foreground mb-4">Acesso Rápido</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Novo Cliente', page: 'clients', color: 'bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20' },
            { label: 'Nova Ideia', page: 'ideas', color: 'bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20' },
            { label: 'Novo Conteúdo', page: 'schedule', color: 'bg-info/10 hover:bg-info/20 text-info border border-info/20' },
            { label: 'Nova Tarefa', page: 'tasks', color: 'bg-warning/10 hover:bg-warning/20 text-warning border border-warning/20' },
          ].map(action => (
            <button
              key={action.label}
              onClick={() => onNavigate(action.page)}
              className={`px-4 py-3 rounded-lg font-medium text-sm transition-colors ${action.color}`}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
