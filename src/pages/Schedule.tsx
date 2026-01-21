import { useState, useMemo, useRef } from 'react';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  DocumentDuplicateIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  CalendarDaysIcon, 
  ArrowPathIcon,
  ArrowUpTrayIcon, 
  XMarkIcon, 
  ArrowDownTrayIcon, 
  ArrowsPointingOutIcon, 
  PhotoIcon, 
  VideoCameraIcon, 
  DocumentIcon, 
  ArrowTopRightOnSquareIcon,
  ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline';
import { useContents, useClients, useEmployees, Content, useApprovals } from '@/hooks/useSupabaseData';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Modal } from '@/components/ui/modal';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { TabsAnimated } from '@/components/ui/tabs-animated';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, isWithinInterval, isSameMonth, parseISO, addDays, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { uploadFile } from '@/lib/supabase-storage';

const contentTypes = [
  { value: 'post', label: 'Card' },
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
  { value: 'draft', label: 'Não iniciado' }, // Mesmo valor de 'content' do kanban
  { value: 'production', label: 'Em produção' },
  { value: 'pending', label: 'Em aprovação' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'revision', label: 'Refação' },
  { value: 'rejected', label: 'Reprovado' },
];

interface SchedulePageProps {
  searchQuery: string;
}

type WeekFilter = 'all' | 'week1' | 'week2' | 'week3' | 'week4' | 'week5' | 'custom';

export function SchedulePage({ searchQuery }: SchedulePageProps) {
  const { data: contents, loading, create, update, remove } = useContents();
  const { data: clients } = useClients();
  const { data: employees } = useEmployees();
  const { user } = useAuth();
  const { create: createApproval } = useApprovals();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingContent, setViewingContent] = useState<Content | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingContent, setEditingContent] = useState<Content | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [weekFilter, setWeekFilter] = useState<WeekFilter>('all');
  const [customDate, setCustomDate] = useState<string>('');
  const [viewMode, setViewMode] = useState<'board' | 'calendar'>('board');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [calendarFilter, setCalendarFilter] = useState<string>('all');
  const [formData, setFormData] = useState({
    client_id: '',
    title: '',
    type: 'post' as Content['type'],
    description: '',
    reference_links: [] as string[],
    reference_files: [] as string[],
    publish_date: '',
    publish_time: '10:00',
    deadline: '',
    deadline_time: '',
    social_network: 'instagram' as Content['social_network'],
    responsible_id: '',
    status: 'draft' as Content['status'],
    copy: '',
    hashtags: '',
  });
  const [referenceLinkInput, setReferenceLinkInput] = useState('');

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
      client_id: activeClients[0]?.id || '',
      title: '',
      type: 'post',
      description: '',
      reference_links: [],
      reference_files: [],
      publish_date: format(currentMonth, 'yyyy-MM-dd'),
      publish_time: '10:00',
      deadline: '',
      deadline_time: '',
      social_network: 'instagram',
      responsible_id: activeEmployees[0]?.id || '',
      status: 'draft',
      copy: '',
      hashtags: '',
    });
    setEditingContent(null);
    setUploadedFiles([]);
    setFilePreviews([]);
    setReferenceLinkInput('');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/') || file.type.startsWith('video/');
      const isValidSize = file.size <= 100 * 1024 * 1024; // 100MB
      return isValidType && isValidSize;
    });

    if (validFiles.length !== files.length) {
      toast.error('Alguns arquivos foram ignorados. Apenas imagens/vídeos até 100MB são permitidos.');
    }

    // Adicionar aos arquivos temporários para preview
    setUploadedFiles(prev => [...prev, ...validFiles]);

    // Criar previews
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreviews(prev => [...prev, e.target?.result as string]);
      };
      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
      } else {
        // Para vídeos, criar uma URL de objeto
        const url = URL.createObjectURL(file);
        setFilePreviews(prev => [...prev, url]);
      }
    });

    // Fazer upload imediatamente para Supabase Storage
    try {
      toast.loading('Enviando arquivos...', { id: 'upload-files-ref' });
      const folder = editingContent ? `contents/${editingContent.id}` : 'contents/temp';
      const uploadPromises = validFiles.map(async (file) => {
        const url = await uploadFile(file, folder);
        return url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const successfulUrls = uploadedUrls.filter((url): url is string => url !== null);
      
      toast.dismiss('upload-files-ref');
      
      if (successfulUrls.length > 0) {
        setFormData(prev => ({
          ...prev,
          reference_files: [...prev.reference_files, ...successfulUrls],
        }));
        toast.success(`${successfulUrls.length} arquivo(s) adicionado(s)!`);
      }

      if (successfulUrls.length < validFiles.length) {
        toast.error(`${validFiles.length - successfulUrls.length} arquivo(s) falharam no upload`);
      }
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.dismiss('upload-files-ref');
      toast.error('Erro ao fazer upload dos arquivos');
    }

    // Limpar o input para permitir selecionar o mesmo arquivo novamente
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddReferenceLink = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const link = referenceLinkInput.trim();
      if (link) {
        // Validar se é uma URL válida
        try {
          new URL(link);
          setFormData(prev => ({
            ...prev,
            reference_links: [...prev.reference_links, link],
          }));
          setReferenceLinkInput('');
          toast.success('Link adicionado!');
        } catch {
          toast.error('Por favor, insira uma URL válida');
        }
      }
    }
  };

  const removeReferenceLink = (index: number) => {
    setFormData(prev => ({
      ...prev,
      reference_links: prev.reference_links.filter((_, i) => i !== index),
    }));
  };

  const removeReferenceFile = (index: number) => {
    const fileToRemove = formData.reference_files[index];
    // Se for uma URL do Storage, poderia deletar, mas por enquanto apenas remove da lista
    setFormData(prev => ({
      ...prev,
      reference_files: prev.reference_files.filter((_, i) => i !== index),
    }));
    // Remover também dos previews e uploadedFiles se existir
    if (index < uploadedFiles.length) {
      setUploadedFiles(prev => prev.filter((_, i) => i !== index));
      setFilePreviews(prev => {
        const removed = prev[index];
        if (removed && !removed.startsWith('data:') && !removed.startsWith('blob:')) {
          URL.revokeObjectURL(removed);
        }
        return prev.filter((_, i) => i !== index);
      });
    }
  };

  const removeFile = (index: number) => {
    // Esta função não é mais usada, mas mantida para compatibilidade
    // Use removeReferenceFile em vez disso
    removeReferenceFile(index);
  };

  const handleViewContent = (content: Content) => {
    setViewingContent(content);
    setIsViewModalOpen(true);
  };

  const downloadFile = async (url: string, filename: string) => {
    try {
      if (url.startsWith('data:') || url.startsWith('blob:')) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Para URLs externas, abrir em nova aba
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
      toast.error('Erro ao baixar arquivo');
    }
  };

  const isImage = (url: string) => {
    return /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(url) || url.startsWith('data:image/') || url.includes('image');
  };

  const isVideo = (url: string) => {
    return /\.(mp4|webm|ogg|mov|avi|mkv|flv|wmv)$/i.test(url) || url.startsWith('data:video/') || url.includes('video');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mostrar notificação de loading ao criar conteúdo
    const isCreating = !editingContent;
    const loadingToastId = isCreating ? toast.loading('Criando conteúdo...', { id: 'creating-content' }) : null;
    
    // Usar os links e arquivos já processados do estado
    const referenceFiles = formData.reference_files || [];
    const referenceLinks = formData.reference_links || [];
    
    const contentData = {
      ...(editingContent ? {} : { user_id: user?.id }),
      client_id: formData.client_id || null,
      title: formData.title.trim(),
      type: formData.type,
      description: formData.description.trim(),
      publish_date: formData.publish_date || null,
      publish_time: formData.publish_time,
      deadline: formData.deadline || null,
      deadline_time: formData.deadline_time || null,
      social_network: formData.social_network,
      responsible_id: formData.responsible_id || null,
      status: formData.status,
      files: referenceFiles.length > 0 ? referenceFiles : [],
      reference_links: referenceLinks.length > 0 ? referenceLinks : [],
      copy: formData.copy.trim(),
      hashtags: formData.hashtags.split(',').map(h => h.trim().replace('#', '')).filter(Boolean),
    };

    try {
      if (editingContent) {
        await update(editingContent.id, contentData);
        
        // Atualizar o Approval correspondente se existir
        const { data: approval } = await supabase
          .from('approvals')
          .select('id')
          .eq('content_id', editingContent.id)
          .single();
        
        if (approval) {
          // Mapear status do Content para status do Approval
          const statusMap: Record<string, string> = {
            'draft': 'content', // Não iniciado -> Conteúdo no kanban
            'production': 'production',
            'pending': 'pending',
            'approved': 'approved',
            'published': 'approved',
            'revision': 'revision',
            'rejected': 'rejected',
          };
          
          const approvalStatus = statusMap[contentData.status] || 'content';
          
          await supabase
            .from('approvals')
            .update({ 
              status: approvalStatus,
              title: contentData.title,
              briefing: contentData.description,
            })
            .eq('content_id', editingContent.id);
        }
        
        toast.success('Conteúdo atualizado!');
      } else {
        const newContent = await create(contentData as any);
        
        // Dismiss loading toast and show success
        if (loadingToastId) toast.dismiss(loadingToastId);
        toast.success('Conteúdo criado!');
        
        // Criar automaticamente um Approval na coluna "Conteúdo" do Kanban
        if (newContent && formData.responsible_id) {
          try {
            await createApproval({
              title: contentData.title,
              client_id: contentData.client_id || null,
              status: 'content',
              content_id: newContent.id, // Relacionar com o conteúdo criado
              files: referenceFiles,
              links: referenceLinks,
              assigned_to: formData.responsible_id || null,
              created_by: user?.id || '',
              position: 0,
              content_type: contentData.type,
              publish_date: contentData.publish_date || null,
              publish_time: contentData.publish_time || null,
              deadline: contentData.deadline || null,
              briefing: contentData.description || null,
              content_files: [],
            } as any);
          } catch (approvalError) {
            console.error('Erro ao criar approval:', approvalError);
            // Não exibir erro ao usuário para não interromper o fluxo
          }
        }
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar conteúdo:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      if (loadingToastId) toast.dismiss(loadingToastId);
      toast.error(`Erro ao salvar conteúdo: ${errorMessage}`);
    }
  };

  const handleEdit = (content: Content) => {
    // Separar deadline em data e hora se existir
    let deadlineDate = '';
    let deadlineTime = '';
    if (content.deadline) {
      // Se deadline incluir hora (formato datetime)
      if (content.deadline.includes('T')) {
        const [date, time] = content.deadline.split('T');
        deadlineDate = date;
        deadlineTime = time.substring(0, 5); // HH:mm
      } else {
        deadlineDate = content.deadline;
        // Verificar se há deadline_time separado
        deadlineTime = (content as any).deadline_time || '';
      }
    }
    
    setFormData({
      client_id: content.client_id || '',
      title: content.title,
      type: content.type,
      description: content.description,
      reference_links: content.reference_links || [],
      reference_files: content.files || [],
      publish_date: content.publish_date || '',
      publish_time: content.publish_time,
      deadline: deadlineDate,
      deadline_time: deadlineTime,
      social_network: content.social_network,
      responsible_id: content.responsible_id || '',
      status: content.status,
      copy: content.copy,
      hashtags: content.hashtags.join(', '),
    });
    setEditingContent(content);
    setUploadedFiles([]);
    setReferenceLinkInput('');
    // Se houver arquivos, criar previews
    if (content.files && content.files.length > 0) {
      setFilePreviews(content.files);
    } else {
      setFilePreviews([]);
    }
    setIsModalOpen(true);
  };

  const handleDuplicate = async (content: Content) => {
    await create({
      client_id: content.client_id,
      type: content.type,
      title: `${content.title} (Cópia)`,
      description: content.description,
      publish_date: content.publish_date,
      publish_time: content.publish_time,
      social_network: content.social_network,
      responsible_id: content.responsible_id,
      status: 'draft',
      files: content.files,
      copy: content.copy,
      hashtags: content.hashtags,
    } as any);
    toast.success('Conteúdo duplicado!');
  };

  const handleDelete = async (id: string) => {
    await remove(id);
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
      if (!content.publish_date) return false;
      const contentDate = parseISO(content.publish_date);
      
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
        if (content.publish_date !== customDate) return false;
      }

      // Filtro por busca
      const matchesSearch = !searchQuery ||
        content.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        content.copy.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSearch;
    }).sort((a, b) => new Date(a.publish_date || '').getTime() - new Date(b.publish_date || '').getTime());
  }, [contents, currentMonth, weekFilter, customDate, searchQuery, weeksOfMonth]);

  // Filtrar conteúdos por cliente
  const getContentsByClient = (clientId: string | null) => {
    if (clientId === 'all') {
      return filteredContents;
    }
    return filteredContents.filter(content => content.client_id === clientId);
  };

  // Agrupar conteúdos por data para um cliente específico
  const getGroupedByDateForClient = (clientId: string | null) => {
    const clientContents = getContentsByClient(clientId);
    const groups: { [key: string]: Content[] } = {};
    clientContents.forEach(content => {
      const dateKey = content.publish_date || '';
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(content);
    });
    return groups;
  };


  const getClientName = (id?: string | null) => id ? clients.find(c => c.id === id)?.name || 'Cliente não encontrado' : 'Sem cliente';
  const getClientColor = (id?: string | null) => id ? clients.find(c => c.id === id)?.color || '#3B82F6' : '#3B82F6';
  const getEmployeeName = (id?: string | null) => id ? employees.find(e => e.id === id)?.name || 'Não atribuído' : 'Não atribuído';

  const monthName = format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR });

  // Funções para visualização de calendário
  const NOT_STARTED_STATUSES = ['draft'];
  
  const filteredContentsForCalendar = useMemo(() => {
    return contents.filter(c => {
      const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [contents, searchQuery]);

  const getContentsForDate = (date: Date, filter: string = calendarFilter) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    let filtered = filteredContentsForCalendar.filter(c => c.publish_date === dateStr);
    
    if (filter === 'not-started') {
      filtered = filtered.filter(c => NOT_STARTED_STATUSES.includes(c.status));
    } else if (filter !== 'all') {
      filtered = filtered.filter(c => c.client_id === filter);
    }
    
    return filtered;
  };

  // Função para renderizar o calendário filtrado
  const renderCalendarFiltered = (filter: string) => {
    return (
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {/* Week days header */}
        <div className="grid grid-cols-7 border-b border-border">
          {weekDays.map(day => (
            <div key={day} className="p-3 text-center text-sm font-medium text-muted-foreground bg-muted/50">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            const dayContents = getContentsForDate(day, filter);
            const isCurrentMonth = isSameMonth(day, calendarDate);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={index}
                onClick={() => dayContents.length > 0 && setSelectedDay(day)}
                className={cn(
                  'min-h-[100px] md:min-h-[120px] p-2 border-b border-r border-border transition-colors',
                  !isCurrentMonth && 'bg-muted/30',
                  dayContents.length > 0 && 'cursor-pointer hover:bg-muted/50'
                )}
              >
                <div className={cn(
                  'w-7 h-7 flex items-center justify-center rounded-full text-sm mb-1',
                  isCurrentDay && 'bg-primary text-primary-foreground font-semibold',
                  !isCurrentMonth && 'text-muted-foreground'
                )}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {dayContents.slice(0, 3).map(content => (
                    <div
                      key={content.id}
                      onClick={(e) => { e.stopPropagation(); setSelectedContent(content); }}
                      className="px-2 py-1 rounded text-xs truncate cursor-pointer transition-opacity hover:opacity-80"
                      style={getContentStyle(content)}
                    >
                      <span className="font-medium">{content.publish_time}</span>
                      <span className="hidden sm:inline"> - {content.title}</span>
                    </div>
                  ))}
                  {dayContents.length > 3 && (
                    <div className="text-xs text-muted-foreground pl-2">
                      +{dayContents.length - 3} mais
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(calendarDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days = [];
    let day = startDate;

    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    return days;
  };

  const calendarDays = renderCalendar();
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const getContentStyle = (content: Content) => {
    const isNotStarted = NOT_STARTED_STATUSES.includes(content.status);
    
    if (isNotStarted) {
      return {
        backgroundColor: '#E5E7EB',
        borderLeft: '3px solid #9CA3AF',
        color: '#6B7280'
      };
    }
    
    return {
      backgroundColor: `${getClientColor(content.client_id)}20`,
      borderLeft: `3px solid ${getClientColor(content.client_id)}`,
    };
  };

  const contentTypesMap: Record<string, string> = {
    post: 'Post Feed',
    card: 'Card',
    reels: 'Reels',
    stories: 'Stories',
    carousel: 'Carrossel',
    tiktok: 'TikTok',
  };

  const socialNetworksMap: Record<string, string> = {
    instagram: 'Instagram',
    facebook: 'Facebook',
    tiktok: 'TikTok',
    linkedin: 'LinkedIn',
  };

  // Função para renderizar o conteúdo de um cliente
  const renderClientContent = (clientId: string | null) => {
    const clientContents = getContentsByClient(clientId);
    const groupedByDate = getGroupedByDateForClient(clientId);
    const sortedDates = Object.keys(groupedByDate).sort();

    if (clientContents.length === 0) {
      return (
        <EmptyState
          icon={CalendarDaysIcon}
          title="Nenhum conteúdo neste período"
          description={`Crie conteúdos para ${monthName}!`}
          action={{
            label: 'Criar Conteúdo',
            onClick: () => { resetForm(); setIsModalOpen(true); }
          }}
        />
      );
    }

    return (
      <div className="space-y-6">
        {sortedDates.map(dateKey => (
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
                  className="bg-card rounded-xl border border-border p-4 card-hover cursor-pointer"
                  onClick={() => handleViewContent(content)}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-1 h-full min-h-[80px] rounded-full flex-shrink-0"
                      style={{ backgroundColor: getClientColor(content.client_id) }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <h3 className="font-semibold text-card-foreground">{content.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {getClientName(content.client_id)} • {contentTypes.find(t => t.value === content.type)?.label}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <StatusBadge status={content.status} type="content" />
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{content.copy}</p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span>🕐 {content.publish_time}</span>
                        <span>📱 {socialNetworks.find(s => s.value === content.social_network)?.label}</span>
                        <span>👤 {getEmployeeName(content.responsible_id)}</span>
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

                    <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleEdit(content)}
                        className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDuplicate(content)}
                        className="p-1.5 text-muted-foreground hover:text-info transition-colors"
                      >
                        <DocumentDuplicateIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(content.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <ArrowPathIcon className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs de Visualização */}
      <div className="bg-card rounded-xl border border-border p-4">
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'board' | 'calendar')}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="board" className="flex items-center gap-2">
              <ClipboardDocumentCheckIcon className="w-4 h-4" />
              Prancheta
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <CalendarDaysIcon className="w-4 h-4" />
              Calendário
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Conteúdo baseado na visualização selecionada */}
      {viewMode === 'board' ? (
        <>
          {/* Card Principal com Tabs de Clientes */}
          <div className="bg-card rounded-xl border border-border p-6">
            {/* Header com navegação de mês, botão novo conteúdo e dropdown de semanas - Primeiro item do card */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-border">
              {/* Navegação do mês */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevMonth}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-bold text-card-foreground capitalize min-w-[200px] text-center">
                  {monthName}
                </h2>
                <button
                  onClick={handleNextMonth}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <ChevronRightIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Botão Novo Conteúdo e Dropdown de Semanas */}
              <div className="flex items-center gap-3">
                <Select
                  value={weekFilter === 'custom' ? 'all' : weekFilter}
                  onValueChange={(value) => {
                    if (value === 'all') {
                      setWeekFilter('all');
                      setCustomDate('');
                    } else {
                      setWeekFilter(value as WeekFilter);
                      setCustomDate('');
                    }
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Selecione a semana" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {weeksOfMonth.slice(0, 4).map((week, index) => (
                      <SelectItem key={index} value={`week${index + 1}`}>
                        Semana {index + 1} ({format(week.start, 'dd')}-{format(week.end, 'dd')})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <button
                  onClick={() => { resetForm(); setIsModalOpen(true); }}
                  className="flex items-center gap-2 px-4 py-2 btn-primary-gradient rounded-lg text-sm font-medium"
                >
                  <PlusIcon className="w-4 h-4" /> Novo Conteúdo
                </button>
              </div>
            </div>

            {/* Tabs de Clientes */}
            <TabsAnimated
              tabs={[
                {
                  title: "Todos",
                  value: "all",
                  content: renderClientContent('all'),
                },
                ...clients.filter(c => c.status === 'active').map(client => ({
                  title: client.name,
                  value: client.id,
                  content: renderClientContent(client.id),
                })),
              ]}
              containerClassName="mb-8"
              activeTabClassName="bg-primary/20"
              tabClassName="text-sm font-medium"
              contentClassName="min-h-[400px] relative"
            />
          </div>
        </>
      ) : (
        <>
          {/* Visualização de Calendário */}
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCalendarDate(subMonths(calendarDate, 1))}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <ChevronLeftIcon className="w-5 h-5" />
                  </button>
                  <h2 className="text-lg font-semibold min-w-[180px] text-center">
                    {format(calendarDate, 'MMMM yyyy', { locale: ptBR })}
                  </h2>
                  <button
                    onClick={() => setCalendarDate(addMonths(calendarDate, 1))}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <ChevronRightIcon className="w-5 h-5" />
                  </button>
                </div>
                <button
                  onClick={() => setCalendarDate(new Date())}
                  className="px-3 py-1.5 text-sm bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                >
                  Hoje
                </button>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { resetForm(); setIsModalOpen(true); }}
                  className="flex items-center gap-2 px-4 py-2 btn-primary-gradient rounded-lg text-sm font-medium"
                >
                  <PlusIcon className="w-4 h-4" /> Novo Conteúdo
                </button>
              </div>
            </div>

            {/* Tabs de Filtro */}
            <div className="bg-card rounded-xl border border-border p-6">
              <TabsAnimated
                tabs={[
                  {
                    title: "Todos",
                    value: "all",
                    content: renderCalendarFiltered('all'),
                  },
                  {
                    title: "Não iniciado",
                    value: "not-started",
                    content: renderCalendarFiltered('not-started'),
                  },
                  ...clients.filter(c => c.status === 'active').map(client => ({
                    title: client.name,
                    value: client.id,
                    content: renderCalendarFiltered(client.id),
                  })),
                ]}
                containerClassName="mb-8"
                activeTabClassName="bg-primary/20"
                tabClassName="text-sm font-medium"
                contentClassName="min-h-[400px] relative"
              />
            </div>
          </div>
        </>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editingContent ? 'Editar Conteúdo' : 'Novo Conteúdo'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Cliente */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Cliente *</label>
            <select
              required
              value={formData.client_id}
              onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
              className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Selecione...</option>
              {clients.filter(c => c.status === 'active').map(client => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </div>

          {/* 2. Título */}
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

          {/* 3. Tipo de Conteúdo */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Tipo de Conteúdo</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as Content['type'] })}
              className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
            >
              {contentTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          {/* 4. Briefing */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Briefing</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {/* 5. Referências - Links e Upload lado a lado */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Referências</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Links de Referência */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-muted-foreground">Links</label>
                <input
                  type="url"
                  value={referenceLinkInput}
                  onChange={(e) => setReferenceLinkInput(e.target.value)}
                  onKeyDown={handleAddReferenceLink}
                  placeholder="https://... (pressione Enter)"
                  className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary text-sm"
                />
                {/* Lista de links adicionados */}
                {formData.reference_links.length > 0 && (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {formData.reference_links.map((link, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between gap-2 px-2 py-1.5 bg-muted/50 rounded text-xs group"
                      >
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 truncate text-primary hover:underline"
                          title={link}
                        >
                          {link}
                        </a>
                        <button
                          type="button"
                          onClick={() => removeReferenceLink(index)}
                          className="p-0.5 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <XMarkIcon className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upload de Arquivos */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-muted-foreground">Arquivos</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-3 py-2 bg-muted rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <ArrowUpTrayIcon className="w-4 h-4" />
                  <span>Selecionar arquivos</span>
                </button>
                {/* Lista de arquivos adicionados */}
                {(formData.reference_files.length > 0 || uploadedFiles.length > 0) && (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {/* Arquivos já enviados */}
                    {formData.reference_files.map((fileUrl, index) => {
                      const isImage = /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(fileUrl) || fileUrl.includes('image');
                      return (
                        <div
                          key={`uploaded-${index}`}
                          className="flex items-center justify-between gap-2 px-2 py-1.5 bg-muted/50 rounded text-xs group"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {isImage ? (
                              <PhotoIcon className="w-3 h-3 text-primary flex-shrink-0" />
                            ) : (
                              <VideoCameraIcon className="w-3 h-3 text-primary flex-shrink-0" />
                            )}
                            <span className="truncate text-muted-foreground">
                              Arquivo {index + 1}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeReferenceFile(index)}
                            className="p-0.5 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <XMarkIcon className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                    {/* Arquivos novos ainda não enviados */}
                    {uploadedFiles.slice(formData.reference_files.length).map((file, index) => {
                      const actualIndex = formData.reference_files.length + index;
                      return (
                        <div
                          key={`new-${index}`}
                          className="flex items-center justify-between gap-2 px-2 py-1.5 bg-muted/50 rounded text-xs group"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {file.type.startsWith('image/') ? (
                              <PhotoIcon className="w-3 h-3 text-primary flex-shrink-0" />
                            ) : (
                              <VideoCameraIcon className="w-3 h-3 text-primary flex-shrink-0" />
                            )}
                            <span className="truncate text-muted-foreground" title={file.name}>
                              {file.name}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeReferenceFile(actualIndex)}
                            className="p-0.5 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <XMarkIcon className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 6. Data e Horário de Publicação */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Data de Publicação</label>
              <input
                type="date"
                value={formData.publish_date}
                onChange={(e) => setFormData({ ...formData, publish_date: e.target.value })}
                className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Horário</label>
              <input
                type="time"
                value={formData.publish_time}
                onChange={(e) => setFormData({ ...formData, publish_time: e.target.value })}
                className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* 7. Prazo com Data e Horário */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Prazo (Data)</label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Prazo (Horário)</label>
              <input
                type="time"
                value={formData.deadline_time}
                onChange={(e) => setFormData({ ...formData, deadline_time: e.target.value })}
                className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* 8. Rede Social */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Rede Social</label>
            <select
              value={formData.social_network}
              onChange={(e) => setFormData({ ...formData, social_network: e.target.value as Content['social_network'] })}
              className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
            >
              {socialNetworks.map(network => (
                <option key={network.value} value={network.value}>{network.label}</option>
              ))}
            </select>
          </div>

          {/* 9. Responsável */}
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

          {/* 10. Status */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as Content['status'] })}
              className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
            >
              {contentStatuses.map(st => (
                <option key={st.value} value={st.value}>{st.label}</option>
              ))}
            </select>
          </div>

          {/* 11. Legenda */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Legenda</label>
            <textarea
              rows={3}
              value={formData.copy}
              onChange={(e) => setFormData({ ...formData, copy: e.target.value })}
              className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {/* 12. Hashtags */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Hashtags (separadas por vírgula)</label>
            <input
              type="text"
              value={formData.hashtags}
              onChange={(e) => setFormData({ ...formData, hashtags: e.target.value })}
              placeholder="marketing, redessociais, conteudo"
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
              {editingContent ? 'Salvar' : 'Criar Conteúdo'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Visualização de Detalhes */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => { setIsViewModalOpen(false); setViewingContent(null); }}
        title={viewingContent?.title || ''}
        size="lg"
      >
        {viewingContent && (
          <div className="space-y-6">
            {/* Informações básicas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Cliente</p>
                <p className="font-medium">{getClientName(viewingContent.client_id)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Tipo</p>
                <p className="font-medium">{contentTypes.find(t => t.value === viewingContent.type)?.label}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Rede Social</p>
                <p className="font-medium">{socialNetworks.find(s => s.value === viewingContent.social_network)?.label}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                <StatusBadge status={viewingContent.status} type="content" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Data de Publicação</p>
                <p className="font-medium">
                  {viewingContent.publish_date 
                    ? format(new Date(viewingContent.publish_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                    : 'Não definida'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Horário</p>
                <p className="font-medium">{viewingContent.publish_time}</p>
              </div>
              {viewingContent.deadline && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Prazo</p>
                  <p className="font-medium">
                    {format(new Date(viewingContent.deadline), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    {viewingContent.deadline_time && ` às ${viewingContent.deadline_time}`}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground mb-1">Responsável</p>
                <p className="font-medium">{getEmployeeName(viewingContent.responsible_id)}</p>
              </div>
            </div>

            {/* Briefing */}
            {viewingContent.description && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Briefing</p>
                <p className="font-medium whitespace-pre-wrap">{viewingContent.description}</p>
              </div>
            )}

            {/* Legenda */}
            {viewingContent.copy && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Legenda</p>
                <p className="font-medium whitespace-pre-wrap">{viewingContent.copy}</p>
              </div>
            )}

            {/* Hashtags */}
            {viewingContent.hashtags.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Hashtags</p>
                <div className="flex flex-wrap gap-2">
                  {viewingContent.hashtags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-primary/10 text-primary text-sm rounded-md">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Referências/Arquivos */}
            {viewingContent.files.length > 0 && (() => {
              // Separar links e arquivos
              const links = viewingContent.files.filter(file => 
                file.startsWith('http://') || file.startsWith('https://')
              );
              const uploads = viewingContent.files.filter(file => 
                !file.startsWith('http://') && !file.startsWith('https://')
              );
              
              return (
                <div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Referências ({viewingContent.files.length})
                  </p>
                  
                  {/* Container flexível: links à esquerda, uploads à direita */}
                  <div className={cn(
                    "grid gap-4",
                    links.length > 0 && uploads.length > 0 ? "grid-cols-2" : "grid-cols-1"
                  )}>
                    {/* Links */}
                    {links.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2 font-medium">Links ({links.length})</p>
                        <div className="space-y-2">
                          {links.map((link, index) => (
                            <a
                              key={index}
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block p-3 bg-muted rounded-lg border border-border hover:bg-muted/80 transition-colors group"
                            >
                              <div className="flex items-center gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                                    {link}
                                  </p>
                                </div>
                                <div className="flex-shrink-0">
                                  <ArrowTopRightOnSquareIcon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Uploads */}
                    {uploads.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2 font-medium">Arquivos ({uploads.length})</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {uploads.map((file, index) => {
                            // Se for base64, usar diretamente; senão, placeholder
                            const fileUrl = file.startsWith('data:') 
                              ? file 
                              : `https://via.placeholder.com/300?text=${encodeURIComponent(file)}`;
                            const isImg = isImage(file);
                            const isVid = isVideo(file);
                            
                            return (
                              <div key={index} className="relative group">
                                <div className="aspect-square rounded-lg overflow-hidden bg-muted border border-border">
                                  {isImg ? (
                                    <img
                                      src={fileUrl}
                                      alt={file}
                                      className="w-full h-full object-cover cursor-pointer"
                                      onClick={() => setFullscreenImage(fileUrl)}
                                    />
                                  ) : isVid ? (
                                    <video
                                      src={fileUrl}
                                      className="w-full h-full object-cover"
                                      controls
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <DocumentIcon className="w-12 h-12 text-muted-foreground" />
                                    </div>
                                  )}
                                </div>
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {isImg && (
                                    <button
                                      onClick={() => setFullscreenImage(fileUrl)}
                                      className="p-1.5 bg-background/80 backdrop-blur-sm rounded-lg hover:bg-background transition-colors"
                                      title="Ampliar"
                                    >
                                      <ArrowsPointingOutIcon className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => downloadFile(fileUrl, file)}
                                    className="p-1.5 bg-background/80 backdrop-blur-sm rounded-lg hover:bg-background transition-colors"
                                    title="Download"
                                  >
                                    <ArrowDownTrayIcon className="w-4 h-4" />
                                  </button>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 truncate" title={file}>
                                  {file.length > 30 ? `${file.substring(0, 30)}...` : file}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </Modal>

      {/* Modal de Tela Cheia para Imagens */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setFullscreenImage(null)}
        >
          <button
            onClick={() => setFullscreenImage(null)}
            className="absolute top-4 right-4 p-2 bg-background/80 backdrop-blur-sm rounded-lg hover:bg-background transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
          <img
            src={fullscreenImage}
            alt="Preview"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Modais do Calendário */}
      {/* Day Detail Modal */}
      <Modal
        isOpen={!!selectedDay}
        onClose={() => setSelectedDay(null)}
        title={selectedDay ? format(selectedDay, "dd 'de' MMMM", { locale: ptBR }) : ''}
      >
        {selectedDay && (
          <div className="space-y-3">
            {getContentsForDate(selectedDay, 'all').map(content => (
              <div
                key={content.id}
                onClick={() => { setSelectedDay(null); setSelectedContent(content); }}
                className="p-4 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-1 h-12 rounded-full"
                    style={{ backgroundColor: NOT_STARTED_STATUSES.includes(content.status) ? '#9CA3AF' : getClientColor(content.client_id) }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium">{content.title}</h4>
                      <StatusBadge status={content.status} type="content" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getClientName(content.client_id)} • {content.publish_time} • {socialNetworksMap[content.social_network]}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Content Detail Modal */}
      <Modal
        isOpen={!!selectedContent}
        onClose={() => setSelectedContent(null)}
        title="Detalhes do Conteúdo"
        size="lg"
      >
        {selectedContent && (
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl"
                style={{ backgroundColor: NOT_STARTED_STATUSES.includes(selectedContent.status) ? '#E5E7EB' : `${getClientColor(selectedContent.client_id)}20` }}
              >
                {selectedContent.type === 'reels' || selectedContent.type === 'tiktok' ? '🎬' : 
                 selectedContent.type === 'carousel' ? '🎨' : '📷'}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-1">{selectedContent.title}</h3>
                <p className="text-muted-foreground">{getClientName(selectedContent.client_id)}</p>
              </div>
              <StatusBadge status={selectedContent.status} type="content" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Data de Publicação</p>
                <p className="font-medium">
                  {selectedContent.publish_date 
                    ? format(new Date(selectedContent.publish_date), "dd 'de' MMMM, yyyy", { locale: ptBR })
                    : 'Não definida'
                  }
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Horário</p>
                <p className="font-medium">{selectedContent.publish_time || 'Não definido'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rede Social</p>
                <p className="font-medium">{socialNetworksMap[selectedContent.social_network]}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tipo</p>
                <p className="font-medium">{contentTypesMap[selectedContent.type] || selectedContent.type}</p>
              </div>
            </div>

            {selectedContent.copy && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Legenda</p>
                <p className="p-3 bg-muted rounded-lg text-sm">{selectedContent.copy}</p>
              </div>
            )}

            {selectedContent.hashtags && selectedContent.hashtags.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Hashtags</p>
                <div className="flex flex-wrap gap-2">
                  {selectedContent.hashtags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-primary/10 text-primary text-sm rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
