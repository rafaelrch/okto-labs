import { useState, useRef, useEffect } from 'react';
import { Plus, Check, MoreHorizontal, Trash2, Copy, ChevronDown, ChevronRight, Circle, CheckCircle2, Clock, Loader2, Users, Calendar, Flag, X, Search, UserPlus, Ban, FileText, Tag as TagIcon } from 'lucide-react';
import { useTasks, useClients, useEmployees, Task } from '@/hooks/useSupabaseData';
import { useAuth } from '@/hooks/useAuth';
import { EmptyState } from '@/components/ui/empty-state';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Modal } from '@/components/ui/modal';
import { Tabs } from '@/components/ui/tabs-animated';
import { toast } from 'sonner';
import { format, isPast, addDays, nextSaturday, nextMonday, addWeeks, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface TasksPageProps {
  searchQuery: string;
}

const priorities = [
  { value: 'urgent', label: 'Urgente', color: 'text-red-500', bgColor: 'bg-red-500' },
  { value: 'high', label: 'Alta', color: 'text-orange-500', bgColor: 'bg-orange-500' },
  { value: 'medium', label: 'Normal', color: 'text-blue-500', bgColor: 'bg-blue-500' },
  { value: 'low', label: 'Baixa', color: 'text-gray-400', bgColor: 'bg-gray-400' },
];

const statusGroups = [
  {
    label: 'Não Iniciado',
    statuses: [
      { value: 'pending', label: 'A FAZER', icon: Circle, color: 'text-gray-500', bgColor: 'bg-gray-100' }
    ]
  },
  {
    label: 'Ativo',
    statuses: [
      { value: 'in_progress', label: 'EM PROGRESSO', icon: Clock, color: 'text-blue-500', bgColor: 'bg-blue-100' }
    ]
  },
  {
    label: 'Fechado',
    statuses: [
      { value: 'completed', label: 'COMPLETO', icon: CheckCircle2, color: 'text-green-500', bgColor: 'bg-green-500 text-white' }
    ]
  }
];

// Função helper para parsear data como local (evita problema de timezone)
const parseLocalDate = (dateString: string | null): Date | null => {
  if (!dateString) return null;
  // Se a data está no formato YYYY-MM-DD, parsear como local
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Mês é 0-indexed
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return new Date(dateString);
};

export function TasksPage({ searchQuery }: TasksPageProps) {
  const { data: tasks, loading, create, update, remove } = useTasks();
  const { data: clients } = useClients();
  const { data: employees } = useEmployees();
  const { user } = useAuth();
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState<Record<string, string>>({});
  const [selectedResponsible, setSelectedResponsible] = useState<string | null>(null);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleQuickCreate = async (status: Task['status']) => {
    const title = newTaskTitle[status]?.trim();
    if (!title) return;

    try {
      await create({
        user_id: user?.id || null,
        title,
        description: '',
        responsible_id: selectedResponsible,
        priority: 'medium',
        due_date: null,
        client_id: null,
        status,
        tags: [],
      } as any);
      setNewTaskTitle(prev => ({ ...prev, [status]: '' }));
      toast.success('Tarefa criada!');
    } catch (error: any) {
      console.error('Erro ao criar tarefa:', error);
      toast.error('Erro ao criar tarefa');
    }
  };

  const handleUpdateTask = async (taskId: string, data: Partial<Task>) => {
    try {
      if (data.status === 'completed') {
        (data as any).completed_at = new Date().toISOString();
      }
      await update(taskId, data);
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
      toast.error('Erro ao atualizar tarefa');
    }
  };

  const handleCreateNewTask = () => {
    // Criar uma tarefa temporária para o modal
    const newTask: Task = {
      id: 'new',
      title: '',
      description: '',
      status: 'pending',
      priority: 'medium',
      responsible_id: selectedResponsible,
      due_date: null,
      client_id: null,
      user_id: user?.id || null,
      tags: [],
      created_at: new Date().toISOString(),
    } as Task;
    setSelectedTask(newTask);
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(id);
      toast.success('Tarefa excluída!');
      setOpenDropdownId(null);
    } catch (error) {
      console.error('Erro ao excluir tarefa:', error);
      toast.error('Erro ao excluir tarefa');
    }
  };

  const handleDuplicate = async (task: Task) => {
    try {
      await create({
        user_id: user?.id || null,
        title: `${task.title} (cópia)`,
        description: task.description,
        responsible_id: task.responsible_id,
        priority: task.priority,
        due_date: task.due_date,
        client_id: task.client_id,
        status: 'pending',
        tags: task.tags.length > 0 ? task.tags : [],
      } as any);
      toast.success('Tarefa duplicada!');
      setOpenDropdownId(null);
    } catch (error: any) {
      console.error('Erro ao duplicar tarefa:', error);
      toast.error('Erro ao duplicar tarefa');
    }
  };

  const getEmployeeName = (id?: string | null) => {
    if (!id) return null;
    return employees.find(e => e.id === id)?.name || null;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Função para verificar se a tarefa está no intervalo de data selecionado
  const matchesDateFilter = (task: Task): boolean => {
    if (!selectedDateFilter) return true;
    
    // Se não há data de entrega, não mostrar quando há filtro ativo
    if (!task.due_date) return false;

    const taskDate = parseLocalDate(task.due_date);
    if (!taskDate) return false;
    taskDate.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (selectedDateFilter) {
      case 'today':
        return isSameDay(taskDate, today);
      
      case 'tomorrow':
        const tomorrow = addDays(today, 1);
        return isSameDay(taskDate, tomorrow);
      
      case 'thisWeek':
        const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Segunda-feira
        const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
        weekEnd.setHours(23, 59, 59, 999);
        return isWithinInterval(taskDate, { start: weekStart, end: weekEnd });
      
      case 'thisMonth':
        const monthStart = startOfMonth(today);
        const monthEnd = endOfMonth(today);
        monthEnd.setHours(23, 59, 59, 999);
        return isWithinInterval(taskDate, { start: monthStart, end: monthEnd });
      
      case 'nextMonth':
        const nextMonthStart = startOfMonth(addDays(endOfMonth(today), 1));
        const nextMonthEnd = endOfMonth(nextMonthStart);
        nextMonthEnd.setHours(23, 59, 59, 999);
        return isWithinInterval(taskDate, { start: nextMonthStart, end: nextMonthEnd });
      
      default:
        return true;
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesResponsible = !selectedResponsible || task.responsible_id === selectedResponsible;
    const matchesDate = matchesDateFilter(task);
    return matchesSearch && matchesResponsible && matchesDate;
  });

  // Get active employees for filter tabs
  const activeEmployees = employees.filter(e => e.status === 'active');

  // Group tasks by status
  const completedTasks = filteredTasks.filter(t => t.status === 'completed');
  const inProgressTasks = filteredTasks.filter(t => t.status === 'in_progress');
  const todoTasks = filteredTasks.filter(t => t.status === 'pending');

  const statusSections = [
    { 
      key: 'completed', 
      label: 'COMPLETO', 
      tasks: completedTasks, 
      icon: CheckCircle2, 
      bgColor: 'bg-green-500',
      textColor: 'text-white'
    },
    { 
      key: 'in_progress', 
      label: 'EM PROGRESSO', 
      tasks: inProgressTasks, 
      icon: Clock, 
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700'
    },
    { 
      key: 'pending', 
      label: 'A FAZER', 
      tasks: todoTasks, 
      icon: Circle, 
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-700'
    },
  ];

  // Quick date options
  const getQuickDates = () => {
    const today = new Date();
    return [
      { label: 'Hoje', date: today, day: format(today, 'EEE', { locale: ptBR }) },
      { label: 'Amanhã', date: addDays(today, 1), day: format(addDays(today, 1), 'EEE', { locale: ptBR }) },
      { label: 'Este fim de semana', date: nextSaturday(today), day: format(nextSaturday(today), 'EEE', { locale: ptBR }) },
      { label: 'Próxima semana', date: nextMonday(today), day: format(nextMonday(today), 'EEE', { locale: ptBR }) },
      { label: '2 semanas', date: addWeeks(today, 2), day: format(addWeeks(today, 2), 'dd MMM', { locale: ptBR }) },
      { label: '4 semanas', date: addWeeks(today, 4), day: format(addWeeks(today, 4), 'dd MMM', { locale: ptBR }) },
    ];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Criar tabs para o filtro
  const filterTabs = [
    {
      title: 'Todas',
      value: 'all',
    },
    ...activeEmployees.map(emp => ({
      title: `${getInitials(emp.name)} ${emp.name.split(' ')[0]}`,
      value: emp.id,
    }))
  ];

  const handleTabChange = (value: string) => {
    if (value === 'all') {
      setSelectedResponsible(null);
    } else {
      setSelectedResponsible(value);
    }
  };

  const dateFilterOptions = [
    { value: 'today', label: 'Hoje' },
    { value: 'tomorrow', label: 'Amanhã' },
    { value: 'thisWeek', label: 'Esta semana' },
    { value: 'thisMonth', label: 'Este mês' },
    { value: 'nextMonth', label: 'Mês que vem' },
  ];

  return (
    <div className="space-y-0 bg-white min-h-screen" style={{ backgroundColor: '#ffffff' }}>
      {/* Filter Tabs */}
      <div className="flex flex-col gap-2 px-4 py-3 border-b border-border bg-white">
        <div className="flex items-center justify-between gap-2">
          <Tabs
            tabs={filterTabs}
            containerClassName="flex-1"
            activeTabClassName="bg-primary"
            tabClassName="text-sm font-medium"
            contentClassName=""
            onValueChange={handleTabChange}
            defaultValue={selectedResponsible || 'all'}
          />
          <button
            onClick={handleCreateNewTask}
            className="flex items-center gap-2 px-4 py-1.5 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary/90 transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add Tarefa
          </button>
        </div>
        
        {/* Date Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Filtro de data:</span>
          <div className="flex items-center gap-1 flex-wrap">
            <button
              onClick={() => setSelectedDateFilter(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                !selectedDateFilter
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Todas
            </button>
            {dateFilterOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setSelectedDateFilter(option.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedDateFilter === option.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>


      {statusSections.map(section => {
        const isCollapsed = collapsedSections[section.key];
        const SectionIcon = section.icon;

        return (
          <div key={section.key} className="border-b border-border last:border-b-0">
            {/* Section Header */}
            <div className="flex items-center gap-3 py-3 px-4 bg-white hover:bg-gray-50 transition-colors">
              <button
                onClick={() => toggleSection(section.key)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              <div className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold",
                section.bgColor,
                section.textColor
              )}>
                <SectionIcon className="w-3.5 h-3.5" />
                {section.label}
              </div>

              <span className="text-sm text-muted-foreground">{section.tasks.length}</span>

              <Popover>
                <PopoverTrigger asChild>
                  <button className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-40 p-1" align="start">
                  <button className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors">
                    Renomear
                  </button>
                </PopoverContent>
              </Popover>

              {isCollapsed && (
                <button
                  onClick={() => toggleSection(section.key)}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors ml-auto"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Tarefa
                </button>
              )}
            </div>

            {/* Section Content */}
            {!isCollapsed && (
              <div>
                {/* Table Header */}
                <div className="grid grid-cols-[1fr_140px_120px_100px_140px_40px] gap-2 px-4 py-2 text-xs text-muted-foreground font-medium border-b border-border/50 bg-white">
                  <span className="pl-8">Nome</span>
                  <span>Responsável</span>
                  <span>Data de entrega</span>
                  <span>Prioridade</span>
                  <span>Status</span>
                  <span></span>
                </div>

                {/* Task Rows */}
                {section.tasks.map(task => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    employees={employees}
                    onUpdate={handleUpdateTask}
                    onDelete={handleDelete}
                    onDuplicate={handleDuplicate}
                    onSelect={() => setSelectedTask(task)}
                    getEmployeeName={getEmployeeName}
                    getInitials={getInitials}
                    getQuickDates={getQuickDates}
                    openDropdownId={openDropdownId}
                    setOpenDropdownId={setOpenDropdownId}
                    dropdownRef={dropdownRef}
                  />
                ))}

                {/* Add Task Row */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-white hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2 flex-1 pl-8">
                    <Plus className="w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={newTaskTitle[section.key] || ''}
                      onChange={(e) => setNewTaskTitle(prev => ({ ...prev, [section.key]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newTaskTitle[section.key]?.trim()) {
                          handleQuickCreate(section.key as Task['status']);
                        }
                      }}
                      placeholder="Adicionar Tarefa"
                      className="flex-1 bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground/50"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          employees={employees}
          clients={clients}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleUpdateTask}
          onCreate={create}
          user={user}
          getEmployeeName={getEmployeeName}
          getInitials={getInitials}
        />
      )}
    </div>
  );
}

// Task Row Component
interface TaskRowProps {
  task: Task;
  employees: any[];
  onUpdate: (id: string, data: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (task: Task) => void;
  onSelect: () => void;
  getEmployeeName: (id?: string | null) => string | null;
  getInitials: (name: string) => string;
  getQuickDates: () => { label: string; date: Date; day: string }[];
  openDropdownId: string | null;
  setOpenDropdownId: (id: string | null) => void;
  dropdownRef: React.RefObject<HTMLDivElement>;
}

function TaskRow({
  task,
  employees,
  onUpdate,
  onDelete,
  onDuplicate,
  onSelect,
  getEmployeeName,
  getInitials,
  getQuickDates,
  openDropdownId,
  setOpenDropdownId,
  dropdownRef,
}: TaskRowProps) {
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [statusSearch, setStatusSearch] = useState('');

  const filteredEmployees = employees.filter(e => 
    e.status === 'active' && 
    e.name.toLowerCase().includes(assigneeSearch.toLowerCase())
  );

  const getPriorityInfo = (priority: Task['priority']) => {
    return priorities.find(p => p.value === priority) || priorities[2];
  };

  const getStatusInfo = (status: Task['status']) => {
    for (const group of statusGroups) {
      const found = group.statuses.find(s => s.value === status);
      if (found) return found;
    }
    return statusGroups[0].statuses[0];
  };

  const statusInfo = getStatusInfo(task.status);
  const priorityInfo = getPriorityInfo(task.priority);
  const StatusIcon = statusInfo.icon;
  const assigneeName = getEmployeeName(task.responsible_id);

  return (
    <div 
      onClick={onSelect}
      className="grid grid-cols-[1fr_140px_120px_100px_140px_40px] gap-2 items-center px-4 py-2 border-b border-border/50 bg-white hover:bg-gray-50 transition-colors group cursor-pointer"
    >
      {/* Name */}
      <div className="flex items-center gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                task.status === 'completed'
                  ? "bg-green-500 text-white"
                  : task.status === 'in_progress'
                  ? "border-2 border-blue-500"
                  : "border-2 border-gray-300 hover:border-gray-400"
              )}
            >
              {task.status === 'completed' && <Check className="w-3 h-3" />}
              {task.status === 'in_progress' && <div className="w-2 h-2 rounded-full bg-blue-500" />}
            </button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-48 p-1" 
            align="start"
          >
            <div onClick={(e) => e.stopPropagation()}>
            {statusGroups.map(group => (
              <div key={group.label}>
                <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">{group.label}</div>
                {group.statuses.map(s => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.value}
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdate(task.id, { status: s.value as Task['status'] });
                      }}
                      className={cn(
                        "flex items-center justify-between w-full px-2 py-2 rounded-md transition-colors",
                        task.status === s.value ? "bg-muted" : "hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center",
                          s.value === 'completed' ? "bg-green-500 text-white" :
                          s.value === 'in_progress' ? "border-2 border-blue-500" :
                          "border-2 border-gray-300"
                        )}>
                          {s.value === 'completed' && <Check className="w-3 h-3" />}
                          {s.value === 'in_progress' && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                        </div>
                        <span className="text-sm">{s.label}</span>
                      </div>
                      {task.status === s.value && <Check className="w-4 h-4" />}
                    </button>
                  );
                })}
              </div>
            ))}
            </div>
          </PopoverContent>
        </Popover>

        <span className="text-sm font-bold text-black truncate">
          {task.title}
        </span>
      </div>

      {/* Assignee */}
      <Popover>
        <PopoverTrigger asChild>
          <button 
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-black/5 transition-colors min-h-[32px]"
          >
            {assigneeName ? (
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs font-medium text-primary-foreground">
                {getInitials(assigneeName)}
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center">
                <Users className="w-3 h-3 text-gray-400" />
              </div>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-72 p-0" 
          align="start"
        >
          <div onClick={(e) => e.stopPropagation()}>
          <div className="p-2 border-b border-border">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-muted rounded-md">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={assigneeSearch}
                onChange={(e) => setAssigneeSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="Buscar ou digitar email..."
                className="flex-1 bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="p-1 max-h-64 overflow-y-auto">
            <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">Responsáveis</div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdate(task.id, { responsible_id: null });
              }}
              className={cn(
                "flex items-center gap-3 w-full px-2 py-2 rounded-md transition-colors",
                !task.responsible_id ? "bg-muted" : "hover:bg-muted/50"
              )}
            >
              <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center">
                <Ban className="w-4 h-4 text-gray-400" />
              </div>
              <span className="text-sm">Sem responsável</span>
            </button>
            {filteredEmployees.map(emp => (
              <button
                key={emp.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdate(task.id, { responsible_id: emp.id });
                }}
                className={cn(
                  "flex items-center gap-3 w-full px-2 py-2 rounded-md transition-colors",
                  task.responsible_id === emp.id ? "bg-muted" : "hover:bg-muted/50"
                )}
              >
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm font-medium text-primary-foreground">
                  {getInitials(emp.name)}
                </div>
                <span className="text-sm">{emp.name}</span>
              </button>
            ))}
            <button 
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-3 w-full px-2 py-2 rounded-md hover:bg-muted/50 transition-colors mt-1 border-t border-border pt-2"
            >
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <UserPlus className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Convidar por email</span>
            </button>
          </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Due Date */}
      <Popover>
        <PopoverTrigger asChild>
          <button 
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-black/5 transition-colors text-sm min-h-[32px]"
          >
            {task.due_date ? (
              <span className={cn(
                isPast(parseLocalDate(task.due_date) || new Date()) && task.status !== 'completed' && 'text-red-500'
              )}>
                {format(parseLocalDate(task.due_date) || new Date(), 'd/M/yy', { locale: ptBR })}
              </span>
            ) : (
              <div className="flex items-center gap-1 text-gray-400">
                <Calendar className="w-4 h-4" />
              </div>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-80 p-0" 
          align="start"
        >
          <div onClick={(e) => e.stopPropagation()}>
          <div className="grid grid-cols-2">
            {/* Quick Options */}
            <div className="border-r border-border p-2">
              {getQuickDates().map((option, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdate(task.id, { due_date: format(option.date, 'yyyy-MM-dd') });
                  }}
                  className="flex items-center justify-between w-full px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                >
                  <span>{option.label}</span>
                  <span className="text-muted-foreground text-xs">{option.day}</span>
                </button>
              ))}
              {task.due_date && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdate(task.id, { due_date: null });
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors text-red-500 mt-2 border-t border-border pt-2"
                >
                  <X className="w-4 h-4" />
                  Remover data
                </button>
              )}
            </div>
            {/* Calendar */}
            <div className="p-3">
              <input
                type="date"
                value={task.due_date || ''}
                onChange={(e) => {
                  e.stopPropagation();
                  onUpdate(task.id, { due_date: e.target.value || null });
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-full px-2 py-1.5 bg-muted rounded-md border-0 outline-none text-sm"
              />
            </div>
          </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Priority */}
      <Popover>
        <PopoverTrigger asChild>
          <button 
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-black/5 transition-colors text-sm min-h-[32px]"
          >
            <Flag className={cn("w-4 h-4", priorityInfo.color)} />
            <span className={priorityInfo.color}>{priorityInfo.label}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-48 p-1" 
          align="start"
        >
          <div onClick={(e) => e.stopPropagation()}>
          <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">Prioridade da Tarefa</div>
          {priorities.map(p => (
            <button
              key={p.value}
              onClick={(e) => {
                e.stopPropagation();
                onUpdate(task.id, { priority: p.value as Task['priority'] });
              }}
              className={cn(
                "flex items-center justify-between w-full px-3 py-2 text-sm rounded-md transition-colors",
                task.priority === p.value ? "bg-muted" : "hover:bg-muted/50"
              )}
            >
              <div className="flex items-center gap-2">
                <Flag className={cn("w-4 h-4", p.color)} />
                <span>{p.label}</span>
              </div>
              {task.priority === p.value && <Check className="w-4 h-4" />}
            </button>
          ))}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdate(task.id, { priority: 'medium' });
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-muted/50 transition-colors border-t border-border mt-1"
          >
            <Ban className="w-4 h-4 text-muted-foreground" />
            <span>Limpar</span>
          </button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Status */}
      <Popover>
        <PopoverTrigger asChild>
          <button 
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors min-h-[32px]",
              statusInfo.bgColor
            )}
          >
            <StatusIcon className="w-3.5 h-3.5" />
            {statusInfo.label}
          </button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-56 p-0" 
          align="start"
        >
          <div onClick={(e) => e.stopPropagation()}>
          <div className="p-2 border-b border-border">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-muted rounded-md">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={statusSearch}
                onChange={(e) => setStatusSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="Buscar..."
                className="flex-1 bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="p-1 max-h-64 overflow-y-auto">
            {statusGroups.map(group => (
              <div key={group.label}>
                <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">{group.label}</div>
                {group.statuses
                  .filter(s => s.label.toLowerCase().includes(statusSearch.toLowerCase()))
                  .map(s => {
                    const Icon = s.icon;
                    return (
                      <button
                        key={s.value}
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdate(task.id, { status: s.value as Task['status'] });
                        }}
                        className={cn(
                          "flex items-center justify-between w-full px-2 py-2 rounded-md transition-colors",
                          task.status === s.value ? "bg-muted" : "hover:bg-muted/50"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium", s.bgColor)}>
                            <Icon className="w-3.5 h-3.5" />
                            {s.label}
                          </div>
                        </div>
                        {task.status === s.value && <Check className="w-4 h-4" />}
                      </button>
                    );
                  })}
              </div>
            ))}
          </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Actions */}
      <div className="relative" ref={openDropdownId === task.id ? dropdownRef : null} onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => setOpenDropdownId(openDropdownId === task.id ? null : task.id)}
          className="p-1.5 text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>

        {openDropdownId === task.id && (
          <div className="absolute right-0 top-full mt-1 w-40 bg-popover border border-border rounded-lg shadow-lg z-50">
            <button
              onClick={() => onDuplicate(task)}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <Copy className="w-4 h-4" /> Duplicar
            </button>
            <button
              onClick={() => onDelete(task.id)}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-muted transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Excluir
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Task Detail Modal Component
interface TaskDetailModalProps {
  task: Task;
  employees: any[];
  clients: any[];
  onClose: () => void;
  onUpdate: (id: string, data: Partial<Task>) => void;
  onCreate?: (data: any) => Promise<any>;
  user?: any;
  getEmployeeName: (id?: string | null) => string | null;
  getInitials: (name: string) => string;
}

function TaskDetailModal({
  task,
  employees,
  clients,
  onClose,
  onUpdate,
  onCreate,
  user,
  getEmployeeName,
  getInitials,
}: TaskDetailModalProps) {
  const isNewTask = task.id === 'new';
  const [localTask, setLocalTask] = useState<Task>(task);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [showDescription, setShowDescription] = useState(!!task.description);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [statusSearch, setStatusSearch] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current && showDescription) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [description, showDescription]);

  // Sincronizar localTask quando task mudar (para edição de tarefas existentes)
  useEffect(() => {
    if (!isNewTask && task.id !== 'new') {
      setLocalTask(task);
      setTitle(task.title);
      setDescription(task.description || '');
      setShowDescription(!!task.description);
    }
  }, [task.id]);

  const getStatusInfo = (status: Task['status']) => {
    for (const group of statusGroups) {
      const found = group.statuses.find(s => s.value === status);
      if (found) return found;
    }
    return statusGroups[0].statuses[0];
  };

  const statusInfo = getStatusInfo(localTask.status);
  const StatusIcon = statusInfo.icon;
  const assigneeName = getEmployeeName(localTask.responsible_id);
  const filteredEmployees = employees.filter(e => 
    e.status === 'active' && 
    e.name.toLowerCase().includes(assigneeSearch.toLowerCase())
  );

  const handleSave = async () => {
    if (isNewTask && onCreate) {
      if (!title.trim()) {
        toast.error('O título da tarefa é obrigatório');
        return;
      }
      try {
        await onCreate({
          user_id: user?.id || null,
          title: title.trim(),
          description: description || '',
          responsible_id: localTask.responsible_id || null,
          priority: localTask.priority || 'medium',
          due_date: localTask.due_date || null,
          client_id: localTask.client_id || null,
          status: localTask.status || 'pending',
          tags: localTask.tags || [],
        });
        toast.success('Tarefa criada!');
        onClose();
      } catch (error: any) {
        console.error('Erro ao criar tarefa:', error);
        toast.error('Erro ao criar tarefa');
      }
    } else {
      onUpdate(localTask.id, { title, description });
      onClose();
    }
  };

  const handleUpdate = (data: Partial<Task>) => {
    if (isNewTask) {
      // Atualizar o estado local da tarefa temporária em tempo real
      setLocalTask(prev => ({ ...prev, ...data }));
      // Se for título ou descrição, atualizar o estado local também
      if (data.title !== undefined) setTitle(data.title);
      if (data.description !== undefined) setDescription(data.description);
    } else {
      // Para tarefas existentes, salvar imediatamente
      onUpdate(localTask.id, data);
    }
  };

  const getPriorityInfo = (priority: Task['priority']) => {
    return priorities.find(p => p.value === priority) || priorities[2];
  };

  const getClientName = (id?: string | null) => {
    if (!id) return null;
    return clients.find(c => c.id === id)?.name || null;
  };

  const getQuickDates = () => {
    const today = new Date();
    return [
      { label: 'Hoje', date: today, day: format(today, 'EEE', { locale: ptBR }) },
      { label: 'Amanhã', date: addDays(today, 1), day: format(addDays(today, 1), 'EEE', { locale: ptBR }) },
      { label: 'Este fim de semana', date: nextSaturday(today), day: format(nextSaturday(today), 'EEE', { locale: ptBR }) },
      { label: 'Próxima semana', date: nextMonday(today), day: format(nextMonday(today), 'EEE', { locale: ptBR }) },
      { label: '2 semanas', date: addWeeks(today, 2), day: format(addWeeks(today, 2), 'dd MMM', { locale: ptBR }) },
      { label: '4 semanas', date: addWeeks(today, 4), day: format(addWeeks(today, 4), 'dd MMM', { locale: ptBR }) },
    ];
  };

  const priorityInfo = getPriorityInfo(localTask.priority);
  const clientName = getClientName(localTask.client_id);

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={
        <input
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (isNewTask) {
              handleUpdate({ title: e.target.value });
            }
          }}
          onBlur={() => {
            if (!isNewTask) {
              handleSave();
            }
          }}
          placeholder="Nome da tarefa"
          className="w-full text-2xl font-bold bg-transparent border-0 outline-none focus:ring-0 placeholder:text-muted-foreground/50"
          onClick={(e) => e.stopPropagation()}
        />
      }
      size="lg"
      autoHeight={true}
    >
      <div className="space-y-4">

        {/* Add Description Button */}
        {!showDescription ? (
          <button
            onClick={() => setShowDescription(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-black/5 rounded-lg transition-colors"
          >
            <FileText className="w-4 h-4" />
            Adicionar descrição
          </button>
        ) : (
          <textarea
            ref={textareaRef}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (isNewTask) {
                handleUpdate({ description: e.target.value });
              }
              // Auto-resize
              if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
                textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
              }
            }}
            onBlur={() => {
              if (!isNewTask) {
                handleUpdate({ description });
              }
            }}
            className="w-full px-3 py-2 bg-transparent border-0 outline-none focus:ring-0 resize-none text-sm placeholder:text-muted-foreground/50 overflow-hidden"
            placeholder="Digite sua descrição..."
            autoFocus
            style={{ minHeight: '60px' }}
          />
        )}

        {/* Extra Buttons Row */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Status */}
          <Popover>
            <PopoverTrigger asChild>
              <button className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
                statusInfo.bgColor,
                localTask.status === 'completed' ? 'text-white border-transparent' : cn(statusInfo.color, 'border-gray-200')
              )}>
                <StatusIcon className="w-4 h-4" />
                {statusInfo.label}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0" align="start">
              <div className="p-2 border-b border-border">
                <div className="flex items-center gap-2 px-2 py-1.5 bg-muted rounded-md">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={statusSearch}
                    onChange={(e) => setStatusSearch(e.target.value)}
                    placeholder="Buscar..."
                    className="flex-1 bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground"
                  />
                </div>
              </div>
              <div className="p-1 max-h-64 overflow-y-auto">
                {statusGroups.map(group => (
                  <div key={group.label}>
                    <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">{group.label}</div>
                    {group.statuses
                      .filter(s => s.label.toLowerCase().includes(statusSearch.toLowerCase()))
                      .map(s => {
                        const Icon = s.icon;
                        return (
                          <button
                            key={s.value}
                            onClick={() => {
                              handleUpdate({ status: s.value as Task['status'] });
                            }}
                            className={cn(
                              "flex items-center justify-between w-full px-2 py-2 rounded-md transition-colors",
                              localTask.status === s.value ? "bg-muted" : "hover:bg-muted/50"
                            )}
                          >
                            <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium", s.bgColor)}>
                              <Icon className="w-3.5 h-3.5" />
                              {s.label}
                            </div>
                            {localTask.status === s.value && <Check className="w-4 h-4" />}
                          </button>
                        );
                      })}
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Cliente */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm text-muted-foreground border border-gray-200 hover:bg-black/5 transition-colors">
                <Users className="w-4 h-4" />
                {clientName || 'Cliente'}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-1" align="start">
              <button
                onClick={() => {
                  handleUpdate({ client_id: null });
                }}
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md transition-colors",
                  !localTask.client_id ? "bg-muted" : "hover:bg-muted/50"
                )}
              >
                Nenhum
              </button>
              {clients.filter(c => c.status === 'active').map(client => (
                <button
                  key={client.id}
                  onClick={() => {
                    handleUpdate({ client_id: client.id });
                  }}
                  className={cn(
                    "flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md transition-colors",
                    localTask.client_id === client.id ? "bg-muted" : "hover:bg-muted/50"
                  )}
                >
                  {client.name}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {/* Responsável */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm text-muted-foreground border border-gray-200 hover:bg-black/5 transition-colors">
                {assigneeName ? (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-xs font-medium text-primary-foreground">
                    {getInitials(assigneeName)}
                  </div>
                ) : (
                  <Users className="w-4 h-4" />
                )}
                {assigneeName ? assigneeName.split(' ')[0] : 'Responsável'}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="start">
              <div className="p-2 border-b border-border">
                <div className="flex items-center gap-2 px-2 py-1.5 bg-muted rounded-md">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={assigneeSearch}
                    onChange={(e) => setAssigneeSearch(e.target.value)}
                    placeholder="Buscar ou digitar email..."
                    className="flex-1 bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground"
                  />
                </div>
              </div>
              <div className="p-1 max-h-64 overflow-y-auto">
                <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">Responsáveis</div>
                <button
                  onClick={() => {
                    handleUpdate({ responsible_id: null });
                  }}
                  className={cn(
                    "flex items-center gap-3 w-full px-2 py-2 rounded-md transition-colors",
                    !localTask.responsible_id ? "bg-muted" : "hover:bg-muted/50"
                  )}
                >
                  <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center">
                    <Ban className="w-4 h-4 text-gray-400" />
                  </div>
                  <span className="text-sm">Sem responsável</span>
                </button>
                {filteredEmployees.map(emp => (
                  <button
                    key={emp.id}
                    onClick={() => {
                      handleUpdate({ responsible_id: emp.id });
                    }}
                    className={cn(
                      "flex items-center gap-3 w-full px-2 py-2 rounded-md transition-colors",
                      localTask.responsible_id === emp.id ? "bg-muted" : "hover:bg-muted/50"
                    )}
                  >
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm font-medium text-primary-foreground">
                      {getInitials(emp.name)}
                    </div>
                    <span className="text-sm">{emp.name}</span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Data */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm text-muted-foreground border border-gray-200 hover:bg-black/5 transition-colors">
                <Calendar className="w-4 h-4" />
                {localTask.due_date ? format(parseLocalDate(localTask.due_date) || new Date(), 'd/M/yy', { locale: ptBR }) : 'Data'}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
              <div className="grid grid-cols-2">
                <div className="border-r border-border p-2">
                  {getQuickDates().map((option, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        handleUpdate({ due_date: format(option.date, 'yyyy-MM-dd') });
                      }}
                      className="flex items-center justify-between w-full px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                    >
                      <span>{option.label}</span>
                      <span className="text-muted-foreground text-xs">{option.day}</span>
                    </button>
                  ))}
                  {localTask.due_date && (
                    <button
                      onClick={() => {
                        handleUpdate({ due_date: null });
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors text-red-500 mt-2 border-t border-border pt-2"
                    >
                      <X className="w-4 h-4" />
                      Remover data
                    </button>
                  )}
                </div>
                <div className="p-3">
                  <input
                    type="date"
                    value={localTask.due_date || ''}
                    onChange={(e) => {
                      handleUpdate({ due_date: e.target.value || null });
                    }}
                    className="w-full px-2 py-1.5 bg-muted rounded-md border-0 outline-none text-sm"
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Prioridade */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm text-muted-foreground border border-gray-200 hover:bg-black/5 transition-colors">
                <Flag className={cn("w-4 h-4", priorityInfo.color)} />
                <span className={priorityInfo.color}>{priorityInfo.label}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1" align="start">
              <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">Prioridade da Tarefa</div>
              {priorities.map(p => (
                <button
                  key={p.value}
                  onClick={() => {
                    handleUpdate({ priority: p.value as Task['priority'] });
                  }}
                  className={cn(
                    "flex items-center justify-between w-full px-3 py-2 text-sm rounded-md transition-colors",
                    localTask.priority === p.value ? "bg-muted" : "hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Flag className={cn("w-4 h-4", p.color)} />
                    <span>{p.label}</span>
                  </div>
                  {localTask.priority === p.value && <Check className="w-4 h-4" />}
                </button>
              ))}
              <button
                onClick={() => {
                  handleUpdate({ priority: 'medium' });
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-muted/50 transition-colors border-t border-border mt-1"
              >
                <Ban className="w-4 h-4 text-muted-foreground" />
                <span>Limpar</span>
              </button>
            </PopoverContent>
          </Popover>

          {/* Tags */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm text-muted-foreground border border-gray-200 hover:bg-black/5 transition-colors">
                <TagIcon className="w-4 h-4" />
                Tags
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="start">
              <label className="block text-xs font-medium text-muted-foreground mb-2">Tags (separadas por vírgula)</label>
              <input
                type="text"
                value={localTask.tags?.join(', ') || ''}
                onChange={(e) => {
                  const tagsArray = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                  handleUpdate({ tags: tagsArray });
                }}
                placeholder="design, urgente, redes sociais"
                className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary text-sm"
              />
              {localTask.tags && localTask.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {localTask.tags.map((tag, i) => (
                    <span key={i} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {/* Footer with Create Button for new tasks */}
        {isNewTask && (
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Criar Tarefa
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
