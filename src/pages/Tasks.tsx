import { useState, useRef, useEffect, useMemo } from 'react';
import { Plus, Check, MoreHorizontal, Edit2, Trash2, Copy, ChevronDown, Circle, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { useTasks, useClients, useEmployees, Task } from '@/hooks/useSupabaseData';
import { TaskStatusMenu, type TaskStatus } from '@/components/tasks/TaskStatusMenu';
import { Modal } from '@/components/ui/modal';
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
  const { data: tasks, loading, create, update, remove } = useTasks();
  const { data: clients } = useClients();
  const { data: employees } = useEmployees();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<typeof employees[0] | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [statusMenu, setStatusMenu] = useState<{ taskId: string; anchorRect: DOMRect } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    responsible_id: '',
    priority: 'medium' as Task['priority'],
    due_date: '',
    client_id: '',
    status: 'pending' as Task['status'],
    tags: '',
  });

  // Close "..." dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      responsible_id: employees.find(e => e.status === 'active')?.id || '',
      priority: 'medium',
      due_date: new Date().toISOString().split('T')[0],
      client_id: '',
      status: 'pending',
      tags: '',
    });
    setEditingTask(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const taskData = {
      title: formData.title,
      description: formData.description,
      responsible_id: formData.responsible_id || null,
      priority: formData.priority,
      due_date: formData.due_date || null,
      client_id: formData.client_id || null,
      status: formData.status,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      completed_at: formData.status === 'completed' ? new Date().toISOString() : null,
    };

    try {
      if (editingTask) {
        await update(editingTask.id, taskData);
        toast.success('Tarefa atualizada!');
      } else {
        await create(taskData as any);
        toast.success('Tarefa criada!');
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Erro ao salvar tarefa');
    }
  };

  const handleEdit = (task: Task) => {
    setFormData({
      title: task.title,
      description: task.description,
      responsible_id: task.responsible_id || '',
      priority: task.priority,
      due_date: task.due_date || '',
      client_id: task.client_id || '',
      status: task.status,
      tags: task.tags.join(', '),
    });
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleChangeStatus = async (task: Task, newStatus: Task['status']) => {
    await update(task.id, {
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null
    });
    setStatusMenu(null);
    toast.success('Status atualizado!');
  };

  const handleToggleComplete = (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    handleChangeStatus(task, newStatus);
  };

  const handleDelete = async (id: string) => {
    await remove(id);
    toast.success('Tarefa excluída!');
    setOpenDropdownId(null);
    setStatusMenu(null);
  };

  const handleDuplicate = async (task: Task) => {
    await create({
      title: `${task.title} (cópia)`,
      description: task.description,
      responsible_id: task.responsible_id,
      priority: task.priority,
      due_date: task.due_date,
      client_id: task.client_id,
      status: 'pending',
      tags: task.tags,
    } as any);
    toast.success('Tarefa duplicada!');
    setOpenDropdownId(null);
    setStatusMenu(null);
  };

  const handleRename = (task: Task) => {
    handleEdit(task);
    setOpenDropdownId(null);
  };

  const getClientName = (id?: string | null) => id ? clients.find(c => c.id === id)?.name : null;
  const getEmployeeName = (id?: string | null) => id ? employees.find(e => e.id === id)?.name || 'Não atribuído' : 'Não atribuído';

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getTaskCountByStatus = (empId: string, status: Task['status']) => {
    return tasks.filter(t => t.responsible_id === empId && t.status === status).length;
  };

  const filterTasks = (taskList: Task[]) => {
    return taskList.filter(task => {
      const matchesSearch = 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesEmployee = !selectedEmployee || task.responsible_id === selectedEmployee.id;
      
      let matchesFilter = true;
      if (task.due_date) {
        const dueDate = new Date(task.due_date);
        
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
      } else if (filterType !== 'all') {
        matchesFilter = false;
      }

      return matchesSearch && matchesEmployee && matchesFilter;
    });
  };

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const openModalWithStatus = (status: Task['status']) => {
    resetForm();
    setFormData(prev => ({ ...prev, status }));
    setIsModalOpen(true);
  };

  // Group tasks by status
  const filteredTasks = filterTasks(tasks);
  const todoTasks = filteredTasks.filter(t => t.status === 'pending');
  const inProgressTasks = filteredTasks.filter(t => t.status === 'in_progress');
  const completedTasks = filteredTasks.filter(t => t.status === 'completed');

  const statusSections = [
    { 
      key: 'completed', 
      label: 'CONCLUÍDA', 
      tasks: completedTasks, 
      icon: CheckCircle2, 
      color: 'bg-success text-success-foreground',
      iconColor: 'text-success'
    },
    { 
      key: 'in_progress', 
      label: 'EM ANDAMENTO', 
      tasks: inProgressTasks, 
      icon: Clock, 
      color: 'bg-primary text-primary-foreground',
      iconColor: 'text-primary'
    },
    { 
      key: 'pending', 
      label: 'A FAZER', 
      tasks: todoTasks, 
      icon: Circle, 
      color: 'bg-muted text-muted-foreground',
      iconColor: 'text-muted-foreground'
    },
  ];

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && t.status !== 'completed').length,
  };

  const filterButtons: { type: FilterType; label: string }[] = [
    { type: 'all', label: 'Todas' },
    { type: 'today', label: 'Hoje' },
    { type: 'tomorrow', label: 'Amanhã' },
    { type: 'week', label: 'Esta Semana' },
    { type: 'month', label: 'Este Mês' },
    { type: 'overdue', label: 'Atrasadas' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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

      {/* Employee Cards */}
      <div className="flex flex-wrap gap-3">
        {employees.filter(e => e.status === 'active').map(employee => {
          const pendingCount = getTaskCountByStatus(employee.id, 'pending');
          const inProgressCount = getTaskCountByStatus(employee.id, 'in_progress');
          const completedCount = getTaskCountByStatus(employee.id, 'completed');
          const isSelected = selectedEmployee?.id === employee.id;

          return (
            <div
              key={employee.id}
              onClick={() => setSelectedEmployee(isSelected ? null : employee)}
              className={cn(
                "flex-1 min-w-[220px] max-w-[320px] bg-card rounded-xl border p-4 cursor-pointer transition-all",
                isSelected 
                  ? 'border-primary ring-2 ring-primary/20 shadow-lg' 
                  : 'border-border hover:border-primary/50 hover:shadow-md'
              )}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-semibold text-sm">
                  {getInitials(employee.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-card-foreground truncate text-sm">{employee.name}</h3>
                  <p className="text-xs text-muted-foreground truncate">{employee.role}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50">
                  <Circle className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">{pendingCount}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/20">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-medium text-primary">{inProgressCount}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-success/20">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                  <span className="text-xs font-medium text-success">{completedCount}</span>
                </div>
              </div>
            </div>
          );
        })}
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
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 btn-primary-gradient rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Nova Tarefa
        </button>
      </div>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
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
        <div className="space-y-4">
          {statusSections.map(section => (
            <div key={section.key} className="bg-card rounded-xl border border-border overflow-visible">
              {/* Section Header */}
              <div className="flex items-center gap-3 p-3 border-b border-border">
                <button
                  onClick={() => toggleSection(section.key)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 transition-transform",
                      collapsedSections[section.key] && "-rotate-90"
                    )}
                  />
                </button>

                <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold", section.color)}>
                  <section.icon className="w-3.5 h-3.5" />
                  {section.label}
                </div>

                <span className="text-sm text-muted-foreground">{section.tasks.length}</span>

                <button
                  onClick={() => openModalWithStatus(section.key as Task['status'])}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors ml-auto"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Tarefa
                </button>
              </div>

              {/* Section Content */}
              {!collapsedSections[section.key] && (
                <div>
                  {section.tasks.length > 0 ? (
                    <>
                      <div className="px-4 py-2 text-xs text-muted-foreground font-medium border-b border-border/50">
                        Nome
                      </div>

                      {section.tasks.map(task => (
                        <div
                          key={task.id}
                          className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-b-0 hover:bg-muted/30 transition-colors"
                        >
                          <button
                            onClick={(e) => {
                              const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                              setStatusMenu((prev) =>
                                prev?.taskId === task.id ? null : { taskId: task.id, anchorRect: rect }
                              );
                            }}
                            className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                              task.status === 'completed'
                                ? "bg-success text-success-foreground"
                                : task.status === 'in_progress'
                                ? "border-2 border-primary text-primary"
                                : "border-2 border-muted-foreground/50 hover:border-primary"
                            )}
                          >
                            {task.status === 'completed' && <Check className="w-3 h-3" />}
                            {task.status === 'in_progress' && (
                              <div className="w-2 h-2 rounded-full bg-primary" />
                            )}
                          </button>

                          <h3
                            className={cn(
                              "flex-1 text-sm",
                              task.status === 'completed' && 'line-through text-muted-foreground'
                            )}
                          >
                            {task.title}
                          </h3>

                          {task.due_date && (
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(task.due_date), "dd 'de' MMM", { locale: ptBR })}
                            </span>
                          )}

                          <div className="relative" ref={openDropdownId === task.id ? dropdownRef : null}>
                            <button
                              onClick={() => setOpenDropdownId(openDropdownId === task.id ? null : task.id)}
                              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>

                            {openDropdownId === task.id && (
                              <div className="absolute right-0 top-full mt-1 w-40 bg-popover border border-border rounded-lg shadow-lg z-50">
                                <button
                                  onClick={() => handleRename(task)}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" /> Editar
                                </button>
                                <button
                                  onClick={() => handleDuplicate(task)}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                                >
                                  <Copy className="w-4 h-4" /> Duplicar
                                </button>
                                <button
                                  onClick={() => handleDelete(task.id)}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-muted transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" /> Excluir
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Nenhuma tarefa
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Status Menu Portal */}
      <TaskStatusMenu
        open={!!statusMenu}
        anchorRect={statusMenu?.anchorRect || null}
        currentStatus={tasks.find(t => t.id === statusMenu?.taskId)?.status || 'pending'}
        onSelect={(status) => {
          const task = tasks.find(t => t.id === statusMenu?.taskId);
          if (task) handleChangeStatus(task, status as Task['status']);
        }}
        onClose={() => setStatusMenu(null)}
      />

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
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Responsável</label>
              <select
                value={formData.responsible_id}
                onChange={(e) => setFormData({ ...formData, responsible_id: e.target.value })}
                className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Selecione...</option>
                {employees.filter(e => e.status === 'active').map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Cliente (opcional)</label>
              <select
                value={formData.client_id}
                onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Nenhum</option>
                {clients.filter(c => c.status === 'active').map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
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
              <label className="block text-sm font-medium text-foreground mb-1">Data de Entrega</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Tags (separadas por vírgula)</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="design, urgente, redes sociais"
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
              {editingTask ? 'Salvar' : 'Criar Tarefa'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
