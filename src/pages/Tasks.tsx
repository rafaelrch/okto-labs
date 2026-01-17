import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check, Calendar, Filter, User } from 'lucide-react';
import { getFromStorage, saveToStorage, Task, Client, Employee, generateId } from '@/lib/storage';
import { Modal } from '@/components/ui/modal';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';
import { format, isToday, isTomorrow, isThisWeek, isThisMonth, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface TasksPageProps {
  searchQuery: string;
}

const priorities = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
];

const statuses = [
  { value: 'pending', label: 'Pendente' },
  { value: 'in_progress', label: 'Em Andamento' },
  { value: 'completed', label: 'Concluída' },
];

type FilterType = 'all' | 'today' | 'tomorrow' | 'week' | 'month' | 'overdue';

export function TasksPage({ searchQuery }: TasksPageProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    responsibleId: '',
    priority: 'medium' as Task['priority'],
    dueDate: '',
    clientId: '',
    status: 'pending' as Task['status'],
    tags: '',
  });

  useEffect(() => {
    setTasks(getFromStorage<Task>('tasks'));
    setClients(getFromStorage<Client>('clients'));
    setEmployees(getFromStorage<Employee>('employees'));
  }, []);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      responsibleId: employees.find(e => e.status === 'active')?.id || '',
      priority: 'medium',
      dueDate: new Date().toISOString().split('T')[0],
      clientId: '',
      status: 'pending',
      tags: '',
    });
    setEditingTask(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newTask: Task = {
      id: editingTask?.id || generateId(),
      title: formData.title,
      description: formData.description,
      responsibleId: formData.responsibleId,
      priority: formData.priority,
      dueDate: formData.dueDate,
      clientId: formData.clientId || undefined,
      status: formData.status,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      createdAt: editingTask?.createdAt || new Date().toISOString(),
      completedAt: formData.status === 'completed' ? new Date().toISOString() : undefined,
    };

    let updatedTasks: Task[];
    if (editingTask) {
      updatedTasks = tasks.map(t => t.id === editingTask.id ? newTask : t);
      toast.success('Tarefa atualizada!');
    } else {
      updatedTasks = [newTask, ...tasks];
      toast.success('Tarefa criada!');
    }

    setTasks(updatedTasks);
    saveToStorage('tasks', updatedTasks);
    setIsModalOpen(false);
    resetForm();
  };

  const handleEdit = (task: Task) => {
    setFormData({
      title: task.title,
      description: task.description,
      responsibleId: task.responsibleId,
      priority: task.priority,
      dueDate: task.dueDate,
      clientId: task.clientId || '',
      status: task.status,
      tags: task.tags.join(', '),
    });
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleToggleComplete = (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    const updatedTasks = tasks.map(t =>
      t.id === task.id ? { 
        ...t, 
        status: newStatus as Task['status'],
        completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined
      } : t
    );
    setTasks(updatedTasks);
    saveToStorage('tasks', updatedTasks);
    toast.success(newStatus === 'completed' ? 'Tarefa concluída!' : 'Tarefa reaberta!');
  };

  const handleDelete = (id: string) => {
    const updatedTasks = tasks.filter(t => t.id !== id);
    setTasks(updatedTasks);
    saveToStorage('tasks', updatedTasks);
    toast.success('Tarefa excluída!');
  };

  const getClientName = (id?: string) => id ? clients.find(c => c.id === id)?.name : null;
  const getEmployeeName = (id: string) => employees.find(e => e.id === id)?.name || 'Não atribuído';

  const filterTasks = (taskList: Task[]) => {
    return taskList.filter(task => {
      const matchesSearch = 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesEmployee = !filterEmployee || task.responsibleId === filterEmployee;
      const matchesStatus = !filterStatus || task.status === filterStatus;
      
      let matchesFilter = true;
      const dueDate = new Date(task.dueDate);
      
      switch (filterType) {
        case 'today':
          matchesFilter = isToday(dueDate);
          break;
        case 'tomorrow':
          matchesFilter = isTomorrow(dueDate);
          break;
        case 'week':
          matchesFilter = isThisWeek(dueDate);
          break;
        case 'month':
          matchesFilter = isThisMonth(dueDate);
          break;
        case 'overdue':
          matchesFilter = isPast(dueDate) && task.status !== 'completed';
          break;
      }

      return matchesSearch && matchesEmployee && matchesStatus && matchesFilter;
    });
  };

  const pendingTasks = filterTasks(tasks.filter(t => t.status !== 'completed'));
  const completedTasks = filterTasks(tasks.filter(t => t.status === 'completed'));

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => isPast(new Date(t.dueDate)) && t.status !== 'completed').length,
  };

  const filterButtons: { type: FilterType; label: string }[] = [
    { type: 'all', label: 'Todas' },
    { type: 'today', label: 'Hoje' },
    { type: 'tomorrow', label: 'Amanhã' },
    { type: 'week', label: 'Esta Semana' },
    { type: 'month', label: 'Este Mês' },
    { type: 'overdue', label: 'Atrasadas' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-card-foreground">{stats.total}</p>
          <p className="text-sm text-muted-foreground">Total</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-success">{stats.completed}</p>
          <p className="text-sm text-muted-foreground">Concluídas</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-destructive">{stats.overdue}</p>
          <p className="text-sm text-muted-foreground">Atrasadas</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {filterButtons.map(btn => (
            <button
              key={btn.type}
              onClick={() => setFilterType(btn.type)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-lg transition-colors',
                filterType === btn.type 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              {btn.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filterEmployee}
            onChange={(e) => setFilterEmployee(e.target.value)}
            className="px-3 py-2 bg-muted rounded-lg text-sm border-0 outline-none"
          >
            <option value="">Todos funcionários</option>
            {employees.filter(e => e.status === 'active').map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
          <button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 btn-primary-gradient rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Nova Tarefa
          </button>
        </div>
      </div>

      {/* Tasks List */}
      {pendingTasks.length === 0 && completedTasks.length === 0 ? (
        <EmptyState
          icon={Check}
          title="Nenhuma tarefa encontrada"
          description="Crie uma nova tarefa para começar!"
          action={{
            label: 'Criar Tarefa',
            onClick: () => { resetForm(); setIsModalOpen(true); }
          }}
        />
      ) : (
        <div className="space-y-6">
          {/* Pending Tasks */}
          <div className="space-y-3">
            {pendingTasks.map(task => {
              const isOverdue = isPast(new Date(task.dueDate)) && task.status !== 'completed';
              return (
                <div 
                  key={task.id} 
                  className={cn(
                    "bg-card rounded-xl border p-4 card-hover",
                    isOverdue ? 'border-destructive/50' : 'border-border'
                  )}
                >
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => handleToggleComplete(task)}
                      className={cn(
                        'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors',
                        task.status === 'completed' 
                          ? 'bg-success border-success text-success-foreground' 
                          : 'border-muted-foreground hover:border-primary'
                      )}
                    >
                      {task.status === 'completed' && <Check className="w-4 h-4" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-1">
                        <h3 className={cn(
                          "font-semibold text-card-foreground",
                          task.status === 'completed' && 'line-through text-muted-foreground'
                        )}>
                          {task.title}
                        </h3>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <StatusBadge status={task.priority} type="priority" />
                          <StatusBadge status={task.status} type="task" />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span className={cn(
                          "flex items-center gap-1",
                          isOverdue && 'text-destructive'
                        )}>
                          <Calendar className="w-3 h-3" />
                          {format(new Date(task.dueDate), "dd 'de' MMM", { locale: ptBR })}
                          {isOverdue && ' (Atrasada)'}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {getEmployeeName(task.responsibleId)}
                        </span>
                        {task.clientId && (
                          <span>📋 {getClientName(task.clientId)}</span>
                        )}
                      </div>
                      {task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {task.tags.map(tag => (
                            <span key={tag} className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(task)}
                        className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Completed Tasks Toggle */}
          {completedTasks.length > 0 && (
            <div>
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Check className="w-4 h-4" />
                {showCompleted ? 'Ocultar' : 'Mostrar'} {completedTasks.length} tarefa(s) concluída(s)
              </button>
              
              {showCompleted && (
                <div className="mt-3 space-y-3">
                  {completedTasks.map(task => (
                    <div 
                      key={task.id} 
                      className="bg-card/50 rounded-xl border border-border p-4 opacity-60"
                    >
                      <div className="flex items-start gap-4">
                        <button
                          onClick={() => handleToggleComplete(task)}
                          className="w-6 h-6 rounded-full bg-success border-success text-success-foreground flex items-center justify-center flex-shrink-0"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <div className="flex-1">
                          <h3 className="font-semibold text-muted-foreground line-through">
                            {task.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Concluída em {format(new Date(task.completedAt!), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Título *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Descrição</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Responsável</label>
              <select
                value={formData.responsibleId}
                onChange={(e) => setFormData({ ...formData, responsibleId: e.target.value })}
                className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Selecione...</option>
                {employees.filter(e => e.status === 'active').map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Data de Entrega</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Prioridade</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
                className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
              >
                {priorities.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Task['status'] })}
                className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
              >
                {statuses.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Cliente (opcional)</label>
              <select
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Nenhum</option>
                {clients.filter(c => c.status === 'active').map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Tags (separadas por vírgula)</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="design, urgente, revisão"
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
              {editingTask ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
