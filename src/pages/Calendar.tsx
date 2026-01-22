import { useState } from 'react';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  XMarkIcon, 
  PhotoIcon, 
  DocumentIcon, 
  ArrowDownTrayIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';
import { useContents, useClients, Content } from '@/hooks/useSupabaseData';
import { Modal } from '@/components/ui/modal';
import { StatusBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  addMonths, 
  subMonths,
  isSameMonth,
  isToday
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Helper para parsear datas YYYY-MM-DD como data local (evita problema de timezone)
const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// Ícones das redes sociais
const SocialNetworkIcon = ({ network }: { network: string }) => {
  switch (network) {
    case 'instagram':
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      );
    case 'facebook':
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      );
    case 'tiktok':
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
        </svg>
      );
    case 'linkedin':
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      );
    default:
      return null;
  }
};

interface CalendarPageProps {
  searchQuery: string;
}

const contentTypes: Record<string, string> = {
  post: 'Post Feed',
  card: 'Card',
  reels: 'Reels',
  stories: 'Stories',
  carousel: 'Carrossel',
  tiktok: 'TikTok',
};

const socialNetworks: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
};

// Status que indicam que o conteúdo ainda não foi iniciado
const NOT_STARTED_STATUSES = ['draft'];

export function CalendarPage({ searchQuery }: CalendarPageProps) {
  const { data: contents = [], isLoading: contentsLoading } = useContents();
  const { data: clients = [] } = useClients();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [fullscreenFile, setFullscreenFile] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [filterClient, setFilterClient] = useState('');
  const [copiedLegenda, setCopiedLegenda] = useState(false);

  // Função para fazer download do arquivo
  const handleDownload = async (fileUrl: string) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // Extrair nome do arquivo da URL
      const fileName = fileUrl.split('/').pop()?.split('?')[0] || 'download';
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Download iniciado!');
    } catch (error) {
      console.error('Erro ao fazer download:', error);
      toast.error('Erro ao fazer download');
    }
  };

  // Função para copiar legenda
  const handleCopyLegenda = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLegenda(true);
      toast.success('Legenda copiada!');
      setTimeout(() => setCopiedLegenda(false), 2000);
    } catch (error) {
      toast.error('Erro ao copiar');
    }
  };

  const getClientName = (id?: string) => clients.find(c => c.id === id)?.name || 'Cliente';
  const getClientColor = (id?: string) => clients.find(c => c.id === id)?.color || '#3B82F6';

  const filteredContents = contents.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClient = !filterClient || c.client_id === filterClient;
    return matchesSearch && matchesClient;
  });

  const getContentsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return filteredContents.filter(c => c.publish_date === dateStr);
  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentDate);
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

  const days = renderCalendar();
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Função para determinar a cor de fundo do conteúdo
  const getContentStyle = (content: Content) => {
    const isNotStarted = NOT_STARTED_STATUSES.includes(content.status);
    
    if (isNotStarted) {
      // Cinza claro para conteúdos não iniciados
      return {
        backgroundColor: '#E5E7EB',
        borderLeft: '3px solid #9CA3AF',
        color: '#6B7280'
      };
    }
    
    // Cor do cliente para outros status
    return {
      backgroundColor: `${getClientColor(content.client_id)}20`,
      borderLeft: `3px solid ${getClientColor(content.client_id)}`,
    };
  };

  if (contentsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold min-w-[180px] text-center">
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <button
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1.5 text-sm bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
          >
            Hoje
          </button>
        </div>
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
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-300" />
          <span className="text-xs text-muted-foreground">Não iniciado</span>
        </div>
        {clients.filter(c => c.status === 'active').map(client => (
          <div key={client.id} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: client.color }}
            />
            <span className="text-xs text-muted-foreground">{client.name}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
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
          {days.map((day, index) => {
            const dayContents = getContentsForDate(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
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
                      onClick={(e) => { e.stopPropagation(); setCarouselIndex(0); setSelectedContent(content); }}
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

      {/* Day Detail Modal */}
      <Modal
        isOpen={!!selectedDay}
        onClose={() => setSelectedDay(null)}
        title={selectedDay ? format(selectedDay, "dd 'de' MMMM", { locale: ptBR }) : ''}
      >
        {selectedDay && (
          <div className="space-y-3">
            {getContentsForDate(selectedDay).map(content => (
              <div
                key={content.id}
                onClick={() => { setSelectedDay(null); setCarouselIndex(0); setSelectedContent(content); }}
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
                      {getClientName(content.client_id)} • {content.publish_time} • {socialNetworks[content.social_network]}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Content Detail Modal */}
      {selectedContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2">
          <div
            className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
            onClick={() => setSelectedContent(null)}
          />
          <div className="relative w-full max-w-5xl bg-card rounded-2xl shadow-xl border border-border animate-scale-in overflow-hidden">
            {/* Content - 2 Columns */}
            <div className="flex p-2 gap-2 max-h-[80vh]">
              {/* Coluna Esquerda - Material Finalizado (Carrossel) */}
              <div className="flex-1 bg-muted/30 rounded-xl flex flex-col min-h-[400px] overflow-hidden relative">
                {selectedContent.finalized_files && selectedContent.finalized_files.length > 0 ? (
                  <>
                    {/* Área do arquivo */}
                    <div className="flex-1 flex items-center justify-center p-4 relative">
                      {(() => {
                        const file = selectedContent.finalized_files[carouselIndex];
                        const isImg = /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(file);
                        const isVid = /\.(mp4|mov|avi|webm|mkv)$/i.test(file);
                        
                        if (isImg) {
                          return (
                            <img
                              src={file}
                              alt="Material finalizado"
                              className="max-w-full max-h-[65vh] object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => setFullscreenFile(file)}
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
                              <DocumentIcon className="w-16 h-16 text-muted-foreground" />
                              <span className="text-sm text-foreground truncate max-w-[200px]">
                                {file.split('/').pop()?.split('?')[0]}
                              </span>
                            </div>
                          );
                        }
                      })()}
                      
                      {/* Setas de navegação */}
                      {selectedContent.finalized_files.length > 1 && (
                        <>
                          <button
                            onClick={() => setCarouselIndex(prev => prev === 0 ? selectedContent.finalized_files!.length - 1 : prev - 1)}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/90 rounded-full shadow-lg hover:bg-white transition-colors"
                          >
                            <ChevronLeftIcon className="w-5 h-5 text-foreground" />
                          </button>
                          <button
                            onClick={() => setCarouselIndex(prev => prev === selectedContent.finalized_files!.length - 1 ? 0 : prev + 1)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/90 rounded-full shadow-lg hover:bg-white transition-colors"
                          >
                            <ChevronRightIcon className="w-5 h-5 text-foreground" />
                          </button>
                        </>
                      )}
                    </div>
                    
                    {/* Barra inferior - Indicadores, Fullscreen e Download */}
                    <div className="flex items-center justify-between px-4 py-3 bg-white/50">
                      {/* Indicadores de página */}
                      <div className="flex items-center gap-2">
                        {selectedContent.finalized_files.length > 1 && selectedContent.finalized_files.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setCarouselIndex(index)}
                            className={`w-2 h-2 rounded-full transition-colors ${
                              index === carouselIndex ? 'bg-primary' : 'bg-muted-foreground/30'
                            }`}
                          />
                        ))}
                        {selectedContent.finalized_files.length > 1 && (
                          <span className="text-xs text-muted-foreground ml-2">
                            {carouselIndex + 1} / {selectedContent.finalized_files.length}
                          </span>
                        )}
                      </div>
                      
                      {/* Botões de ação */}
                      <div className="flex items-center gap-2">
                        {/* Download */}
                        <button
                          onClick={() => handleDownload(selectedContent.finalized_files![carouselIndex])}
                          className="p-2 rounded-lg hover:bg-muted transition-colors"
                          title="Baixar arquivo"
                        >
                          <ArrowDownTrayIcon className="w-5 h-5 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center p-8">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                        <PhotoIcon className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground">Este conteúdo ainda não foi aprovado</p>
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
                    <p className="text-sm text-muted-foreground">{getClientName(selectedContent.client_id)}</p>
                  </div>
                  <button
                    onClick={() => setSelectedContent(null)}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors flex-shrink-0"
                  >
                    <XMarkIcon className="w-5 h-5 text-muted-foreground" />
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
                
                {/* Links de Material Finalizado */}
                {selectedContent.finalized_links && selectedContent.finalized_links.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Links</p>
                    <div className="space-y-2">
                      {selectedContent.finalized_links.map((link, index) => (
                        <a
                          key={index}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-primary hover:underline truncate"
                        >
                          <ArrowTopRightOnSquareIcon className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{link}</span>
                        </a>
                      ))}
                    </div>
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
                      <SocialNetworkIcon network={selectedContent.social_network} />
                      <p className="text-sm font-medium">{socialNetworks[selectedContent.social_network]}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Tipo</p>
                    <p className="text-sm font-medium">{contentTypes[selectedContent.type] || selectedContent.type}</p>
                  </div>
                </div>
                
                {/* Legenda */}
                {selectedContent.copy && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-muted-foreground">Legenda</p>
                      <button
                        onClick={() => handleCopyLegenda(selectedContent.copy)}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                        title="Copiar legenda"
                      >
                        {copiedLegenda ? (
                          <CheckIcon className="w-4 h-4 text-green-500" />
                        ) : (
                          <ClipboardDocumentIcon className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                    <p className="text-sm bg-muted/50 p-3 rounded-lg whitespace-pre-wrap">{selectedContent.copy}</p>
                  </div>
                )}
                
                {/* Hashtags */}
                {selectedContent.hashtags && selectedContent.hashtags.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Hashtags</p>
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
            </div>
          </div>
        </div>
      )}

      {/* Modal de Tela Cheia */}
      {fullscreenFile && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90"
          onClick={() => setFullscreenFile(null)}
        >
          <button
            onClick={() => setFullscreenFile(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors z-10"
          >
            <XMarkIcon className="w-6 h-6 text-white" />
          </button>
          
          {/* Botão de Download */}
          <button
            onClick={(e) => { e.stopPropagation(); handleDownload(fullscreenFile); }}
            className="absolute top-4 right-16 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors z-10"
          >
            <ArrowDownTrayIcon className="w-6 h-6 text-white" />
          </button>
          
          {/\.(mp4|mov|avi|webm|mkv)$/i.test(fullscreenFile) ? (
            <video
              src={fullscreenFile}
              controls
              autoPlay
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={fullscreenFile}
              alt="Arquivo em tela cheia"
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </div>
  );
}
