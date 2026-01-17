import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, Copy, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { getFromStorage, saveToStorage, Content, Client, Employee, generateId } from '@/lib/storage';
import { Modal } from '@/components/ui/modal';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, isWithinInterval, isSameMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const contentTypes = [
  { value: 'post', label: 'Post Feed' },
  { value: 'reels', label: 'Reels' },
  { value: 'stories', label: 'Stories' },
  { value: 'carousel', label: 'Carrossel' },
  { value: 'tiktok', label: 'TikTok' },
];

const socialNetworks = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'linkedin', label: 'LinkedIn' },
];

const contentStatuses = [
  { value: 'draft', label: 'Rascunho' },
  { value: 'production', label: 'Em Produção' },
  { value: 'pending', label: 'Aguardando Aprovação' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'published', label: 'Publicado' },
];

interface SchedulePageProps {
  searchQuery: string;
}

type WeekFilter = 'all' | 'week1' | 'week2' | 'week3' | 'week4' | 'week5' | 'custom';

export function SchedulePage({ searchQuery }: SchedulePageProps) {
  const [contents, setContents] = useState<Content[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<Content | null>(null);
  const [filterClient, setFilterClient] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [weekFilter, setWeekFilter] = useState<WeekFilter>('all');
  const [customDate, setCustomDate] = useState<string>('');
  const [formData, setFormData] = useState({
    clientId: '',
    type: 'post' as Content['type'],
    title: '',
    description: '',
    publishDate: '',
    publishTime: '10:00',
    socialNetwork: 'instagram' as Content['socialNetwork'],
    responsibleId: '',
    status: 'draft' as Content['status'],
    files: '',
    copy: '',
    hashtags: '',
  });

  useEffect(() => {
    setContents(getFromStorage<Content>('contents'));
    setClients(getFromStorage<Client>('clients'));
    setEmployees(getFromStorage<Employee>('employees'));
  }, []);

  // Calcular as semanas do mês atual
  const weeksOfMonth = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const weeks: { start: Date; end: Date; label: string }[] = [];
    
    let weekStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    let weekNumber = 1;
    
    while (weekStart <= monthEnd) {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
      weeks.push({
        start: weekStart,
        end: weekEnd,
        label: `Semana ${weekNumber}`
      });
      weekStart = addWeeks(weekStart, 1);
      weekNumber++;
    }
    
    return weeks;
  }, [currentMonth]);

  const resetForm = () => {
    const activeClients = clients.filter(c => c.status === 'active');
    const activeEmployees = employees.filter(e => e.status === 'active');
    setFormData({
      clientId: activeClients[0]?.id || '',
      type: 'post',
      title: '',
      description: '',
      publishDate: format(currentMonth, 'yyyy-MM-dd'),
      publishTime: '10:00',
      socialNetwork: 'instagram',
      responsibleId: activeEmployees[0]?.id || '',
      status: 'draft',
      files: '',
      copy: '',
      hashtags: '',
    });
    setEditingContent(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newContent: Content = {
      id: editingContent?.id || generateId(),
      clientId: formData.clientId,
      type: formData.type,
      title: formData.title,
      description: formData.description,
      publishDate: formData.publishDate,
      publishTime: formData.publishTime,
      socialNetwork: formData.socialNetwork,
      responsibleId: formData.responsibleId,
      status: formData.status,
      files: formData.files.split(',').map(f => f.trim()).filter(Boolean),
      copy: formData.copy,
      hashtags: formData.hashtags.split(',').map(h => h.trim().replace('#', '')).filter(Boolean),
      createdAt: editingContent?.createdAt || new Date().toISOString(),
    };

    let updatedContents: Content[];
    if (editingContent) {
      updatedContents = contents.map(c => c.id === editingContent.id ? newContent : c);
      toast.success('Conteúdo atualizado!');
    } else {
      updatedContents = [newContent, ...contents];
      toast.success('Conteúdo criado!');
    }

    setContents(updatedContents);
    saveToStorage('contents', updatedContents);
    setIsModalOpen(false);
    resetForm();
  };

  const handleEdit = (content: Content) => {
    setFormData({
      clientId: content.clientId,
      type: content.type,
      title: content.title,
      description: content.description,
      publishDate: content.publishDate,
      publishTime: content.publishTime,
      socialNetwork: content.socialNetwork,
      responsibleId: content.responsibleId,
      status: content.status,
      files: content.files.join(', '),
      copy: content.copy,
      hashtags: content.hashtags.join(', '),
    });
    setEditingContent(content);
    setIsModalOpen(true);
  };

  const handleDuplicate = (content: Content) => {
    const duplicated: Content = {
      ...content,
      id: generateId(),
      title: `${content.title} (Cópia)`,
      status: 'draft',
      createdAt: new Date().toISOString(),
    };
    const updatedContents = [duplicated, ...contents];
    setContents(updatedContents);
    saveToStorage('contents', updatedContents);
    toast.success('Conteúdo duplicado!');
  };

  const handleDelete = (id: string) => {
    const updatedContents = contents.filter(c => c.id !== id);
    setContents(updatedContents);
    saveToStorage('contents', updatedContents);
    toast.success('Conteúdo excluído!');
  };

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
    setWeekFilter('all');
    setCustomDate('');
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
    setWeekFilter('all');
    setCustomDate('');
  };

  // Filtrar conteúdos pelo mês atual e outros filtros
  const filteredContents = useMemo(() => {
    return contents.filter(content => {
      const contentDate = parseISO(content.publishDate);
      
      // Filtro por mês
      const isInMonth = isSameMonth(contentDate, currentMonth);
      if (!isInMonth) return false;

      // Filtro por semana
      if (weekFilter !== 'all' && weekFilter !== 'custom') {
        const weekIndex = parseInt(weekFilter.replace('week', '')) - 1;
        const week = weeksOfMonth[weekIndex];
        if (week) {
          const isInWeek = isWithinInterval(contentDate, { start: week.start, end: week.end });
          if (!isInWeek) return false;
        }
      }

      // Filtro por data específica
      if (weekFilter === 'custom' && customDate) {
        if (content.publishDate !== customDate) return false;
      }

      // Outros filtros
      const matchesSearch = 
        content.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        content.copy.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesClient = !filterClient || content.clientId === filterClient;
      const matchesStatus = !filterStatus || content.status === filterStatus;
      
      return matchesSearch && matchesClient && matchesStatus;
    }).sort((a, b) => new Date(a.publishDate).getTime() - new Date(b.publishDate).getTime());
  }, [contents, currentMonth, weekFilter, customDate, searchQuery, filterClient, filterStatus, weeksOfMonth]);

  // Agrupar conteúdos por data
  const groupedByDate = useMemo(() => {
    const groups: { [key: string]: Content[] } = {};
    filteredContents.forEach(content => {
      const dateKey = content.publishDate;
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(content);
    });
    return groups;
  }, [filteredContents]);

  const getClientName = (id: string) => clients.find(c => c.id === id)?.name || 'Cliente não encontrado';
  const getClientColor = (id: string) => clients.find(c => c.id === id)?.color || '#3B82F6';
  const getEmployeeName = (id: string) => employees.find(e => e.id === id)?.name || 'Não atribuído';

  const monthName = format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="space-y-6">
      {/* Header com navegação de mês */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Navegação do mês */}
          <div className="flex items-center gap-4">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-card-foreground capitalize min-w-[200px] text-center">
              {monthName}
            </h2>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 btn-primary-gradient rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Novo Conteúdo
          </button>
        </div>

        {/* Filtros por semana */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => { setWeekFilter('all'); setCustomDate(''); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              weekFilter === 'all' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Todas
          </button>
          {weeksOfMonth.map((week, index) => (
            <button
              key={index}
              onClick={() => { setWeekFilter(`week${index + 1}` as WeekFilter); setCustomDate(''); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                weekFilter === `week${index + 1}`
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Semana {index + 1}
              <span className="ml-1 text-xs opacity-70">
                ({format(week.start, 'dd')}-{format(week.end, 'dd')})
              </span>
            </button>
          ))}
          <div className="flex items-center gap-2 ml-2">
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
            <input
              type="date"
              value={customDate}
              onChange={(e) => { 
                setCustomDate(e.target.value); 
                setWeekFilter('custom'); 
              }}
              className="px-2 py-1.5 bg-muted rounded-lg text-sm border-0 outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Filtros adicionais */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <select
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
            className="px-3 py-2 bg-muted rounded-lg text-sm border-0 outline-none"
          >
            <option value="">Todos clientes</option>
            {clients.filter(c => c.status === 'active').map(client => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-muted rounded-lg text-sm border-0 outline-none"
          >
            <option value="">Todos status</option>
            {contentStatuses.map(st => (
              <option key={st.value} value={st.value}>{st.label}</option>
            ))}
          </select>
          <span className="text-sm text-muted-foreground ml-auto">
            {filteredContents.length} conteúdo{filteredContents.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Contents List agrupada por data */}
      {filteredContents.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nenhum conteúdo neste período"
          description={`Crie conteúdos para ${monthName}!`}
          action={{
            label: 'Criar Conteúdo',
            onClick: () => { resetForm(); setIsModalOpen(true); }
          }}
        />
      ) : (
        <div className="space-y-6">
          {Object.keys(groupedByDate).sort().map(dateKey => (
            <div key={dateKey} className="space-y-3">
              {/* Header da data */}
              <div className="flex items-center gap-3">
                <div className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-center min-w-[60px]">
                  <div className="text-2xl font-bold">{format(parseISO(dateKey), 'dd')}</div>
                  <div className="text-xs uppercase">{format(parseISO(dateKey), 'EEE', { locale: ptBR })}</div>
                </div>
                <div className="h-px bg-border flex-1" />
                <span className="text-sm text-muted-foreground">
                  {groupedByDate[dateKey].length} conteúdo{groupedByDate[dateKey].length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Cards dos conteúdos */}
              <div className="space-y-3 pl-[72px]">
                {groupedByDate[dateKey].map(content => (
                  <div 
                    key={content.id} 
                    className="bg-card rounded-xl border border-border p-4 card-hover"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="w-1 h-full min-h-[80px] rounded-full flex-shrink-0"
                        style={{ backgroundColor: getClientColor(content.clientId) }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <h3 className="font-semibold text-card-foreground">{content.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {getClientName(content.clientId)} • {contentTypes.find(t => t.value === content.type)?.label}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <StatusBadge status={content.status} type="content" />
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{content.copy}</p>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          <span>🕐 {content.publishTime}</span>
                          <span>📱 {socialNetworks.find(s => s.value === content.socialNetwork)?.label}</span>
                          <span>👤 {getEmployeeName(content.responsibleId)}</span>
                        </div>

                        {content.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {content.hashtags.slice(0, 5).map(tag => (
                              <span key={tag} className="text-xs text-primary">#{tag}</span>
                            ))}
                            {content.hashtags.length > 5 && (
                              <span className="text-xs text-muted-foreground">+{content.hashtags.length - 5}</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleEdit(content)}
                          className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(content)}
                          className="p-1.5 text-muted-foreground hover:text-info transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(content.id)}
                          className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editingContent ? 'Editar Conteúdo' : 'Novo Conteúdo'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Cliente *</label>
              <select
                required
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Selecione...</option>
                {clients.filter(c => c.status === 'active').map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Tipo de Conteúdo</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as Content['type'] })}
                className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
              >
                {contentTypes.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

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
            <label className="block text-sm font-medium text-foreground mb-1">Descrição/Roteiro</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Data de Publicação</label>
              <input
                type="date"
                value={formData.publishDate}
                onChange={(e) => setFormData({ ...formData, publishDate: e.target.value })}
                className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Horário</label>
              <input
                type="time"
                value={formData.publishTime}
                onChange={(e) => setFormData({ ...formData, publishTime: e.target.value })}
                className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Rede Social</label>
              <select
                value={formData.socialNetwork}
                onChange={(e) => setFormData({ ...formData, socialNetwork: e.target.value as Content['socialNetwork'] })}
                className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
              >
                {socialNetworks.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Content['status'] })}
                className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
              >
                {contentStatuses.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Responsável</label>
            <select
              value={formData.responsibleId}
              onChange={(e) => setFormData({ ...formData, responsibleId: e.target.value })}
              className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Selecione...</option>
              {employees.filter(e => e.status === 'active').map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name} - {emp.role}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Copy/Legenda</label>
            <textarea
              rows={3}
              value={formData.copy}
              onChange={(e) => setFormData({ ...formData, copy: e.target.value })}
              className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Hashtags (separadas por vírgula)</label>
              <input
                type="text"
                value={formData.hashtags}
                onChange={(e) => setFormData({ ...formData, hashtags: e.target.value })}
                placeholder="cafe, receita, lifestyle"
                className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Arquivos (nomes separados por vírgula)</label>
              <input
                type="text"
                value={formData.files}
                onChange={(e) => setFormData({ ...formData, files: e.target.value })}
                placeholder="video.mp4, imagem.jpg"
                className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => { setIsModalOpen(false); resetForm(); }}
              className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 btn-primary-gradient rounded-lg font-medium"
            >
              {editingContent ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
