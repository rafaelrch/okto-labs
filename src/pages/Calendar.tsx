import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Eye, X } from 'lucide-react';
import { getFromStorage, Content, Client } from '@/lib/storage';
import { Modal } from '@/components/ui/modal';
import { StatusBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';
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
  isSameDay,
  isToday
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CalendarPageProps {
  searchQuery: string;
}

const contentTypes: Record<string, string> = {
  post: 'Post Feed',
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

export function CalendarPage({ searchQuery }: CalendarPageProps) {
  const [contents, setContents] = useState<Content[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [filterClient, setFilterClient] = useState('');
  const [view, setView] = useState<'month' | 'week'>('month');

  useEffect(() => {
    setContents(getFromStorage<Content>('contents'));
    setClients(getFromStorage<Client>('clients'));
  }, []);

  const getClientName = (id: string) => clients.find(c => c.id === id)?.name || 'Cliente';
  const getClientColor = (id: string) => clients.find(c => c.id === id)?.color || '#3B82F6';

  const filteredContents = contents.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClient = !filterClient || c.clientId === filterClient;
    return matchesSearch && matchesClient;
  });

  const getContentsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return filteredContents.filter(c => c.publishDate === dateStr);
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
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold min-w-[180px] text-center">
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <button
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
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
                      onClick={(e) => { e.stopPropagation(); setSelectedContent(content); }}
                      className={cn(
                        'px-2 py-1 rounded text-xs truncate cursor-pointer transition-opacity hover:opacity-80',
                        content.status === 'approved' || content.status === 'published' 
                          ? 'opacity-100' 
                          : 'opacity-60'
                      )}
                      style={{ 
                        backgroundColor: `${getClientColor(content.clientId)}20`,
                        borderLeft: `3px solid ${getClientColor(content.clientId)}`,
                      }}
                    >
                      <span className="font-medium">{content.publishTime}</span>
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
                onClick={() => { setSelectedDay(null); setSelectedContent(content); }}
                className="p-4 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-1 h-12 rounded-full"
                    style={{ backgroundColor: getClientColor(content.clientId) }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium">{content.title}</h4>
                      <StatusBadge status={content.status} type="content" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getClientName(content.clientId)} • {content.publishTime} • {socialNetworks[content.socialNetwork]}
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
                style={{ backgroundColor: `${getClientColor(selectedContent.clientId)}20` }}
              >
                {selectedContent.type === 'reels' || selectedContent.type === 'tiktok' ? '🎬' : 
                 selectedContent.type === 'carousel' ? '🎨' : '📷'}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-1">{selectedContent.title}</h3>
                <p className="text-muted-foreground">{getClientName(selectedContent.clientId)}</p>
              </div>
              <StatusBadge status={selectedContent.status} type="content" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Data de Publicação</p>
                <p className="font-medium">{format(new Date(selectedContent.publishDate), "dd 'de' MMMM, yyyy", { locale: ptBR })}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Horário</p>
                <p className="font-medium">{selectedContent.publishTime}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rede Social</p>
                <p className="font-medium">{socialNetworks[selectedContent.socialNetwork]}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tipo</p>
                <p className="font-medium">{contentTypes[selectedContent.type]}</p>
              </div>
            </div>

            {selectedContent.copy && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Legenda</p>
                <p className="p-3 bg-muted rounded-lg text-sm">{selectedContent.copy}</p>
              </div>
            )}

            {selectedContent.hashtags.length > 0 && (
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
