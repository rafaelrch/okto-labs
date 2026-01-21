import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DndContext, DragOverlay, closestCorners, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors, DragEndEvent, DragStartEvent, useDroppable } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  XMarkIcon, 
  PaperAirplaneIcon, 
  ArrowUpTrayIcon, 
  LinkIcon, 
  PhotoIcon, 
  VideoCameraIcon, 
  DocumentIcon, 
  ArrowTopRightOnSquareIcon, 
  ArrowsPointingOutIcon, 
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UsersIcon,
  EllipsisVerticalIcon,
  TrashIcon,
  PencilIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  EyeIcon,
  FolderIcon,
  NoSymbolIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { useApprovalComments, ApprovalComment, useClients, useEmployees, Employee, useContents, Content } from '@/hooks/useSupabaseData';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Modal } from '@/components/ui/modal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { uploadFile, deleteFile, isStorageUrl } from '@/lib/supabase-storage';

// Roles da área criativa
const CREATIVE_ROLES = ['designer', 'editor', 'editor de vídeo', 'editor de video', 'motion', 'ilustrador', 'diretor de arte'];

interface ApprovalsPageProps {
  searchQuery: string;
}

// Tipos de conteúdo
const CONTENT_TYPES: Record<string, string> = {
  post: 'Post Feed',
  card: 'Card',
  reels: 'Reels',
  stories: 'Stories',
  carousel: 'Carrossel',
  tiktok: 'TikTok',
};

const COLUMNS = [
  { id: 'content', label: 'Conteúdo', color: 'bg-gray-400' },
  { id: 'production', label: 'Em Produção', color: 'bg-purple-500' },
  { id: 'pending', label: 'Em Aprovação', color: 'bg-yellow-500' },
  { id: 'approved', label: 'Aprovado', color: 'bg-green-500' },
  { id: 'revision', label: 'Refação', color: 'bg-blue-500' },
  { id: 'rejected', label: 'Reprovado', color: 'bg-red-500' },
] as const;

type ColumnId = typeof COLUMNS[number]['id'];

// Componente de Card Sortable
function SortableCard({ 
  content, 
  onClick, 
  onRename, 
  onDelete 
}: { 
  content: Content; 
  onClick: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: content.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-card rounded-lg border border-border hover:shadow-md transition-all select-none relative group flex",
        isDragging && "shadow-lg opacity-50"
      )}
    >
      {/* Drag Handle - lado esquerdo sempre visível */}
      <div 
        {...attributes}
        {...listeners}
        className="flex items-center justify-center px-2 cursor-grab active:cursor-grabbing hover:bg-muted/50 rounded-l-lg border-r border-border"
        title="Arrastar"
      >
        <svg className="w-4 h-4 text-muted-foreground" fill="currentColor" viewBox="0 0 16 16">
          <circle cx="4" cy="4" r="1.5"/>
          <circle cx="4" cy="8" r="1.5"/>
          <circle cx="4" cy="12" r="1.5"/>
          <circle cx="10" cy="4" r="1.5"/>
          <circle cx="10" cy="8" r="1.5"/>
          <circle cx="10" cy="12" r="1.5"/>
        </svg>
      </div>

      {/* Conteúdo clicável */}
      <button
        type="button"
        onClick={onClick}
        className="flex-1 p-3 text-left min-w-0"
      >
        <h3 className="font-semibold text-sm mb-1 line-clamp-2">{content.title}</h3>
        <div className="flex items-center gap-3">
          {content.files.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <PhotoIcon className="w-3 h-3" />
              <span>{content.files.length}</span>
            </div>
          )}
        </div>
      </button>

      {/* Menu de opções - canto superior direito */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="p-1 rounded hover:bg-muted transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <EllipsisVerticalIcon className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename(); }}>
              <PencilIcon className="w-4 h-4 mr-2" />
              Renomear
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="text-destructive focus:text-destructive"
            >
              <TrashIcon className="w-4 h-4 mr-2" />
              Remover
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// Componente de Coluna com Droppable
function Column({ 
  column, 
  contents, 
  onCardClick, 
  onAddCard: _onAddCard,
  onRenameCard,
  onDeleteCard,
  isDragging,
}: { 
  column: typeof COLUMNS[number]; 
  contents: Content[];
  onCardClick: (content: Content) => void;
  onAddCard: (title: string) => void;
  onRenameCard: (content: Content) => void;
  onDeleteCard: (content: Content) => void;
  isDragging?: boolean;
}) {
  // Hook para detectar quando item está sobre a coluna
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "flex flex-col h-full rounded-lg border-2 transition-all duration-200",
        isOver && isDragging
          ? "border-primary bg-primary/10 shadow-lg shadow-primary/20" 
          : "border-border bg-muted/30"
      )}
    >
      {/* Header da Coluna */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <div className={cn("w-3 h-3 rounded-full", column.color)} />
          <h2 className="font-semibold text-sm">{column.label}</h2>
          <span className="ml-auto text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full">
            {contents.length}
          </span>
        </div>
      </div>

      {/* Cards da Coluna */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px]">
        <SortableContext items={contents.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {contents.map(content => (
            <SortableCard 
              key={content.id} 
              content={content} 
              onClick={() => onCardClick(content)} 
              onRename={() => onRenameCard(content)}
              onDelete={() => onDeleteCard(content)}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

export function ApprovalsPage({ searchQuery }: ApprovalsPageProps) {
  const { data: contents, loading: contentsLoading, update: updateContent, remove: deleteContent } = useContents();
  const { data: clients } = useClients();
  const { data: employees } = useEmployees();
  const { user } = useAuth();
  
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);

  // Filtrar funcionários da área criativa
  const creativeEmployees = useMemo(() => {
    return employees?.filter(emp => 
      emp.status === 'active' && 
      CREATIVE_ROLES.some(role => emp.role?.toLowerCase().includes(role.toLowerCase()))
    ) || [];
  }, [employees]);

  // Definir o primeiro funcionário criativo como selecionado quando carregar
  useEffect(() => {
    if (creativeEmployees.length > 0 && !selectedEmployee) {
      setSelectedEmployee(creativeEmployees[0].id);
    }
  }, [creativeEmployees, selectedEmployee]);
  
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10, // Requer 10px de movimento para ativar o drag
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // Para touch, aguarda 250ms
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Mapear status de Content para colunas do kanban
  const contentStatusToColumn: Record<string, ColumnId> = {
    'draft': 'content', // Não iniciado -> Conteúdo
    'production': 'production',
    'pending': 'pending',
    'approved': 'approved',
    'revision': 'revision',
    'rejected': 'rejected',
  };

  // Organizar conteúdos por coluna (filtrado por funcionário)
  const contentsByColumn = useMemo(() => {
    const grouped: Record<ColumnId, Content[]> = {
      content: [],
      production: [],
      pending: [],
      approved: [],
      revision: [],
      rejected: [],
    };

    contents
      .filter(c => {
        const matchesSearch = !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesEmployee = !selectedEmployee || c.responsible_id === selectedEmployee;
        return matchesSearch && matchesEmployee;
      })
      .forEach(content => {
        const columnId = contentStatusToColumn[content.status] || 'content';
        if (grouped[columnId]) {
          grouped[columnId].push(content);
        }
      });

    // Ordenar por data de criação (mais recentes primeiro)
    Object.keys(grouped).forEach(key => {
      grouped[key as ColumnId].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

    return grouped;
  }, [contents, searchQuery, selectedEmployee]);

  // Função para obter nome do cliente
  const getClientName = (clientId?: string) => {
    if (!clientId) return 'Sem cliente';
    return clients.find(c => c.id === clientId)?.name || 'Cliente';
  };

  // Função para obter nome do responsável
  const getResponsibleName = (responsibleId?: string) => {
    if (!responsibleId) return 'Sem responsável';
    return employees.find(e => e.id === responsibleId)?.name || 'Responsável';
  };

  // Abrir modal de detalhes (definir antes dos handlers de drag)
  const handleCardClick = (content: Content) => {
    setSelectedContent(content);
    setIsModalOpen(true);
  };

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Mapear coluna do kanban para status do Content
  const columnToContentStatus: Record<ColumnId, Content['status']> = {
    'content': 'draft',
    'production': 'production',
    'pending': 'pending',
    'approved': 'approved',
    'revision': 'revision',
    'rejected': 'rejected',
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const activeContent = contents.find(c => c.id === active.id);
    if (!activeContent) return;

    // Verificar se soltou diretamente em uma coluna
    const overColumnId = COLUMNS.find(col => col.id === over.id)?.id;
    if (overColumnId) {
      const newContentStatus = columnToContentStatus[overColumnId];
      const currentColumn = contentStatusToColumn[activeContent.status];
      
      if (overColumnId === currentColumn) return;

      // Atualizar status do Content
      await updateContent(activeContent.id, { status: newContentStatus });
      
      toast.success(`Movido para ${COLUMNS.find(c => c.id === overColumnId)?.label}`);
      return;
    }

    // Se soltou em outro card
    const overContent = contents.find(c => c.id === over.id);
    if (!overContent) return;

    const currentColumn = contentStatusToColumn[activeContent.status];
    const targetColumn = contentStatusToColumn[overContent.status];

    // Se o card de destino está em outra coluna, mover para essa coluna
    if (targetColumn !== currentColumn) {
      const newContentStatus = columnToContentStatus[targetColumn];
      await updateContent(activeContent.id, { status: newContentStatus });
      
      toast.success(`Movido para ${COLUMNS.find(c => c.id === targetColumn)?.label}`);
      return;
    }

    // Reordenar na mesma coluna (opcional, já que não temos position em contents)
    // Por enquanto, apenas atualizamos o status se necessário
  };

  // Criar novo card (criar um Content)
  const handleAddCard = async (title: string, columnId: ColumnId) => {
    try {
      const contentStatus = columnToContentStatus[columnId];
      
      await supabase.from('contents').insert({
        title,
        status: contentStatus,
        client_id: null,
        type: 'post',
        description: '',
        publish_date: null,
        publish_time: '10:00',
        deadline: null,
        social_network: 'instagram',
        responsible_id: selectedEmployee,
        files: [],
        copy: '',
        hashtags: [],
        user_id: user?.id,
      });
      
      toast.success('Item criado!');
    } catch (error) {
      console.error('Erro ao criar item:', error);
      toast.error('Erro ao criar item');
    }
  };

  // Funções para renomear e deletar cards
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameContent, setRenameContent] = useState<Content | null>(null);
  const [renameTitle, setRenameTitle] = useState('');

  const handleRenameCard = (content: Content) => {
    setRenameContent(content);
    setRenameTitle(content.title);
    setRenameModalOpen(true);
  };

  const handleRenameSubmit = async () => {
    if (!renameContent || !renameTitle.trim()) return;
    try {
      await updateContent(renameContent.id, { title: renameTitle.trim() });
      toast.success('Item renomeado!');
      setRenameModalOpen(false);
      setRenameContent(null);
    } catch (error) {
      console.error('Erro ao renomear:', error);
      toast.error('Erro ao renomear item');
    }
  };

  const handleDeleteCard = async (content: Content) => {
    if (!confirm(`Tem certeza que deseja remover "${content.title}"?`)) return;
    try {
      await deleteContent(content.id);
      toast.success('Item removido!');
    } catch (error) {
      console.error('Erro ao remover:', error);
      toast.error('Erro ao remover item');
    }
  };

  // Modal de Detalhes (estilo Trello)
  const activeContent = activeId ? contents.find(c => c.id === activeId) : null;

  if (contentsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <ArrowPathIcon className="w-8 h-8 animate-spin text-primary" />
              </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs de Funcionários Criativos */}
      <div className="flex flex-row items-center justify-start [perspective:1000px] relative overflow-auto sm:overflow-visible no-visible-scrollbar max-w-full w-full gap-1">
        {creativeEmployees.map((emp) => (
          <button
            key={emp.id}
            onClick={() => setSelectedEmployee(emp.id)}
            className={cn("relative px-4 py-2 rounded-full transition-colors", 
              selectedEmployee === emp.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
            style={{ transformStyle: "preserve-3d" }}
          >
            {selectedEmployee === emp.id && (
              <motion.div
                layoutId="approvals-tab"
                transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
                className="absolute inset-0 bg-primary/20 rounded-full"
              />
            )}
            <span className="relative flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">
                {emp.name?.charAt(0).toUpperCase()}
                  </div>
              <span className="whitespace-nowrap">{emp.name}</span>
            </span>
          </button>
                ))}
        </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={selectedEmployee || 'default'}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {/* Kanban Board */}
            <div className="grid grid-cols-6 gap-4 h-[calc(100vh-300px)]">
              {/* Todas as colunas do Kanban */}
              {COLUMNS.map(column => (
                <Column
                  key={column.id}
                  column={column}
                  contents={contentsByColumn[column.id]}
                  onCardClick={handleCardClick}
                  onAddCard={(title) => handleAddCard(title, column.id)}
                  onRenameCard={handleRenameCard}
                  onDeleteCard={handleDeleteCard}
                  isDragging={!!activeId}
                />
              ))}
          </div>
          
            <DragOverlay>
              {activeId ? (() => {
                const activeContent = contents.find(c => c.id === activeId);
                return activeContent ? (
                  <div className="bg-card rounded-lg border border-border p-4 shadow-lg opacity-90">
                    <h3 className="font-semibold text-sm">{activeContent.title}</h3>
                  </div>
                ) : null;
              })() : null}
            </DragOverlay>
          </DndContext>
        </motion.div>
      </AnimatePresence>

      {/* Modal de Detalhes estilo Trello */}
      {selectedContent && (
        <ContentDetailModal
          content={selectedContent}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedContent(null);
          }}
          onUpdate={async (updates) => {
            await updateContent(selectedContent.id, updates);
            
            // Atualizar estado local
            setSelectedContent({ ...selectedContent, ...updates });
            toast.success('Atualizado!');
          }}
          clients={clients || []}
          creativeEmployees={creativeEmployees}
        />
      )}

      {/* Modal de Renomear */}
      <Modal
        isOpen={renameModalOpen}
        onClose={() => {
          setRenameModalOpen(false);
          setRenameContent(null);
        }}
        title="Renomear Item"
        size="sm"
      >
        <div className="space-y-4 p-4">
          <input
            type="text"
            value={renameTitle}
            onChange={(e) => setRenameTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameSubmit();
            }}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Novo título..."
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setRenameModalOpen(false);
                setRenameContent(null);
              }}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleRenameSubmit}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Salvar
            </button>
          </div>
        </div>
      </Modal>
      </div>
    );
}

// Componente de Galeria em Tela Cheia com Navegação
function FullscreenGallery({
  files,
  currentIndex,
  onClose,
  onNavigate,
  isImage,
  isVideo,
}: {
  files: string[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  isImage: (url: string) => boolean;
  isVideo: (url: string) => boolean;
}) {
  const currentFile = files[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < files.length - 1;

  const goToPrev = () => {
    if (hasPrev) onNavigate(currentIndex - 1);
  };

  const goToNext = () => {
    if (hasNext) onNavigate(currentIndex + 1);
  };

  // Suporte a teclas de seta
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPrev();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, files.length]);

            return (
              <div
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Botão Fechar */}
          <button
        onClick={onClose}
        className="absolute top-4 right-4 p-3 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors z-10"
      >
        <XMarkIcon className="w-6 h-6 text-white" />
          </button>

      {/* Contador */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white text-sm">
        {currentIndex + 1} / {files.length}
                  </div>

      {/* Botão Anterior */}
      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); goToPrev(); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors z-10"
        >
          <ChevronLeftIcon className="w-8 h-8 text-white" />
        </button>
      )}

      {/* Botão Próximo */}
      {hasNext && (
            <button
          onClick={(e) => { e.stopPropagation(); goToNext(); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors z-10"
            >
          <ChevronRightIcon className="w-8 h-8 text-white" />
            </button>
      )}

      {/* Conteúdo (Imagem ou Vídeo) */}
      <div 
        className="max-w-[90vw] max-h-[90vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {isImage(currentFile) ? (
          <img
            src={currentFile}
            alt={`Arquivo ${currentIndex + 1}`}
            className="max-w-full max-h-[90vh] object-contain"
          />
        ) : isVideo(currentFile) ? (
          <video
            src={currentFile}
            className="max-w-full max-h-[90vh]"
            controls
            autoPlay
          />
        ) : (
          <div className="flex items-center justify-center w-64 h-64 bg-white/10 rounded-lg">
            <DocumentIcon className="w-24 h-24 text-white/50" />
                    </div>
        )}
                    </div>

      {/* Thumbnails na parte inferior */}
      {files.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg max-w-[90vw] overflow-x-auto">
          {files.map((file, idx) => (
            <button
              key={idx}
              onClick={(e) => { e.stopPropagation(); onNavigate(idx); }}
              className={cn(
                "w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all",
                idx === currentIndex 
                  ? "border-white scale-110" 
                  : "border-transparent opacity-60 hover:opacity-100"
              )}
            >
              {isImage(file) ? (
                <img src={file} alt="" className="w-full h-full object-cover" />
              ) : isVideo(file) ? (
                <video src={file} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-white/20 flex items-center justify-center">
                  <DocumentIcon className="w-6 h-6 text-white/50" />
                  </div>
              )}
            </button>
              ))}
            </div>
          )}
        </div>
            );
}

// Modal de Detalhes (estilo da segunda imagem)
function ContentDetailModal({
  content,
  isOpen,
  onClose,
  onUpdate,
  clients,
  creativeEmployees,
}: {
  content: Content;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updates: Partial<Content>) => Promise<void>;
  clients: any[];
  creativeEmployees: Employee[];
}) {
  // Mapear status do Content para coluna do kanban
  const contentStatusToColumn: Record<Content['status'], ColumnId> = {
    'draft': 'content',
    'production': 'production',
    'pending': 'pending',
    'approved': 'approved',
    'revision': 'revision',
    'rejected': 'rejected',
    'published': 'approved',
  };

  // Mapear coluna do kanban para status do Content
  const columnToContentStatus: Record<ColumnId, Content['status']> = {
    'content': 'draft',
    'production': 'production',
    'pending': 'pending',
    'approved': 'approved',
    'revision': 'revision',
    'rejected': 'rejected',
  };

  const [title, setTitle] = useState(content.title);
  const [clientId, setClientId] = useState(content.client_id || '');
  const [status, setStatus] = useState(content.status);
  const [hoveredStatus, setHoveredStatus] = useState<Content['status'] | null>(null);
  const [assignedTo, setAssignedTo] = useState<string | null>(content.responsible_id || null);
  const [files, setFiles] = useState<string[]>(content.files || []);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Campos de conteúdo
  const [contentType, setContentType] = useState(content.type || '');
  const [publishDate, setPublishDate] = useState(content.publish_date || '');
  const [publishTime, setPublishTime] = useState(content.publish_time || '');
  const [deadline, setDeadline] = useState(content.deadline || '');
  const [deadlineTime, setDeadlineTime] = useState((content as any).deadline_time || '');
  const [briefing, setBriefing] = useState(content.description || '');
  const [copy, setCopy] = useState(content.copy || '');
  const [contentFiles, setContentFiles] = useState<string[]>(content.finalized_files || []);
  const [contentFullscreenIndex, setContentFullscreenIndex] = useState<number | null>(null);
  const contentFileInputRef = useRef<HTMLInputElement>(null);
  
  // Links de referência
  const [links, setLinks] = useState<string[]>(content.reference_links || []);
  const [newLink, setNewLink] = useState('');
  
  // Links de material finalizado
  const [finalizedLinks, setFinalizedLinks] = useState<string[]>(content.finalized_links || []);
  const [newFinalizedLink, setNewFinalizedLink] = useState('');
  
  // Tab para anexos
  const [activeAttachmentTab, setActiveAttachmentTab] = useState<'references' | 'final'>('references');
  
  // Modal de briefing expandido
  const [briefingExpanded, setBriefingExpanded] = useState(false);
  
  // Modal de legenda expandida
  const [copyExpanded, setCopyExpanded] = useState(false);
  
  // Usar content_id para buscar comentários
  const { data: comments, create: createComment } = useApprovalComments(undefined, content.id);
  const { user } = useAuth();
  const { data: employees } = useEmployees();
  const [newComment, setNewComment] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments]);

  // Sincronizar com content quando mudar
  useEffect(() => {
    setTitle(content.title);
    setClientId(content.client_id || '');
    setStatus(content.status);
    setAssignedTo(content.responsible_id || null);
    setFiles(content.files || []);
    setContentType(content.type || '');
    setPublishDate(content.publish_date || '');
    setPublishTime(content.publish_time || '');
    setDeadline(content.deadline || '');
    setDeadlineTime((content as any).deadline_time || '');
    setBriefing(content.description || '');
    setCopy(content.copy || '');
    setContentFiles(content.finalized_files || []);
    setLinks(content.reference_links || []);
    setFinalizedLinks(content.finalized_links || []);
  }, [content.id]);

  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingContentFiles, setIsUploadingContentFiles] = useState(false);

  // Upload de arquivos para o Supabase Storage e salva no banco
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    
    try {
      // Criar previews temporários enquanto faz upload
      const tempPreviews = selectedFiles.map(file => URL.createObjectURL(file));
      setFilePreviews(prev => [...prev, ...tempPreviews]);

      // Fazer upload de cada arquivo para o Supabase Storage
      const uploadPromises = selectedFiles.map(async (file) => {
        const url = await uploadFile(file, `contents/${content.id}`);
        return url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const successfulUrls = uploadedUrls.filter((url): url is string => url !== null);

      if (successfulUrls.length > 0) {
        // Atualizar estado local
        const newFiles = [...files, ...successfulUrls];
        setFiles(newFiles);
        
        // SALVAR IMEDIATAMENTE NO BANCO DE DADOS
        await onUpdate({ files: newFiles });
        toast.success(`${successfulUrls.length} arquivo(s) enviado(s) e salvo(s)!`);
      }

      if (successfulUrls.length < selectedFiles.length) {
        toast.error(`${selectedFiles.length - successfulUrls.length} arquivo(s) falharam no upload`);
      }

      // Limpar previews temporários
      tempPreviews.forEach(url => URL.revokeObjectURL(url));
      setFilePreviews([]);
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao fazer upload dos arquivos');
    } finally {
      setIsUploading(false);
      // Limpar input para permitir selecionar o mesmo arquivo novamente
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeFile = async (index: number) => {
    const fileToRemove = files[index];
    
    // Se for uma URL do Storage, deletar o arquivo
    if (fileToRemove && isStorageUrl(fileToRemove)) {
      await deleteFile(fileToRemove);
    }
    
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    setFilePreviews(prev => prev.filter((_, i) => i !== index));
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    
    // SALVAR IMEDIATAMENTE NO BANCO DE DADOS
    await onUpdate({ files: newFiles });
    toast.success('Arquivo removido!');
  };

  const addLink = async () => {
    if (newLink.trim() && (newLink.startsWith('http://') || newLink.startsWith('https://'))) {
      const newLinks = [...links, newLink.trim()];
      setLinks(newLinks);
      setNewLink('');
      
      // SALVAR IMEDIATAMENTE NO BANCO DE DADOS em reference_links
      await onUpdate({ reference_links: newLinks });
      toast.success('Link adicionado!');
    } else if (newLink.trim()) {
      toast.error('Link deve começar com http:// ou https://');
    }
  };

  const removeLink = async (index: number) => {
    const newLinks = links.filter((_, i) => i !== index);
    setLinks(newLinks);
    
    // SALVAR IMEDIATAMENTE NO BANCO DE DADOS em reference_links
    await onUpdate({ reference_links: newLinks });
    toast.success('Link removido!');
  };

  const addFinalizedLink = async () => {
    if (newFinalizedLink.trim() && (newFinalizedLink.startsWith('http://') || newFinalizedLink.startsWith('https://'))) {
      const newLinks = [...finalizedLinks, newFinalizedLink.trim()];
      setFinalizedLinks(newLinks);
      setNewFinalizedLink('');
      
      // SALVAR IMEDIATAMENTE NO BANCO DE DADOS em finalized_links
      await onUpdate({ finalized_links: newLinks });
      toast.success('Link de material finalizado adicionado!');
    } else if (newFinalizedLink.trim()) {
      toast.error('Link deve começar com http:// ou https://');
    }
  };

  const removeFinalizedLink = async (index: number) => {
    const newLinks = finalizedLinks.filter((_, i) => i !== index);
    setFinalizedLinks(newLinks);
    
    // SALVAR IMEDIATAMENTE NO BANCO DE DADOS em finalized_links
    await onUpdate({ finalized_links: newLinks });
    toast.success('Link de material finalizado removido!');
  };

  // Upload de arquivos de material finalizado
  const handleContentFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    // Validar tamanho dos arquivos (100MB por arquivo)
    const invalidFiles = selectedFiles.filter(file => file.size > 100 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      toast.error(`${invalidFiles.length} arquivo(s) excedem o limite de 100MB`);
      if (contentFileInputRef.current) {
        contentFileInputRef.current.value = '';
      }
      return;
    }

    setIsUploadingContentFiles(true);
    
    try {
      toast.loading('Enviando arquivos...', { id: 'upload-finalized' });
      
      // Fazer upload de cada arquivo para o Supabase Storage
      const uploadPromises = selectedFiles.map(async (file) => {
        try {
          const url = await uploadFile(file, `contents/${content.id}/finalized`);
          if (!url) {
            console.error(`Falha no upload do arquivo: ${file.name}`);
          }
          return { file: file.name, url };
        } catch (error) {
          console.error('Erro ao fazer upload do arquivo:', file.name, error);
          return { file: file.name, url: null };
        }
      });

      const uploadResults = await Promise.all(uploadPromises);
      const successfulUrls = uploadResults
        .filter((result): result is { file: string; url: string } => result.url !== null)
        .map(result => result.url);
      
      const failedFiles = uploadResults.filter(result => result.url === null);

      toast.dismiss('upload-finalized');

      if (successfulUrls.length > 0) {
        const newContentFiles = [...contentFiles, ...successfulUrls];
        setContentFiles(newContentFiles);
        // Salvar em finalized_files conforme a nova estrutura
        await onUpdate({ finalized_files: newContentFiles });
        toast.success(`${successfulUrls.length} arquivo(s) de material finalizado enviado(s)!`);
      }

      if (failedFiles.length > 0) {
        const failedNames = failedFiles.map(f => f.file).join(', ');
        toast.error(`Falha no upload de ${failedFiles.length} arquivo(s): ${failedNames}`);
      }

      if (successfulUrls.length === 0 && failedFiles.length > 0) {
        toast.error('Nenhum arquivo foi enviado com sucesso. Verifique as permissões do bucket e o console para mais detalhes.');
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.dismiss('upload-finalized');
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Erro ao fazer upload dos arquivos: ${errorMessage}`);
    } finally {
      setIsUploadingContentFiles(false);
      if (contentFileInputRef.current) {
        contentFileInputRef.current.value = '';
      }
    }
  };

  const removeContentFile = async (index: number) => {
    const fileToRemove = contentFiles[index];
    
    try {
      // Se for uma URL do Storage, deletar o arquivo
      if (fileToRemove && isStorageUrl(fileToRemove)) {
        await deleteFile(fileToRemove);
      }
      
      const newContentFiles = contentFiles.filter((_, i) => i !== index);
      setContentFiles(newContentFiles);
      // Salvar em finalized_files conforme a nova estrutura
      await onUpdate({ finalized_files: newContentFiles });
      toast.success('Arquivo de material finalizado removido!');
    } catch (error) {
      console.error('Erro ao remover arquivo:', error);
      toast.error('Erro ao remover arquivo');
    }
  };

  // Salvar campos de conteúdo
  const handleContentTypeChange = async (value: string) => {
    setContentType(value);
    await onUpdate({ type: value as Content['type'] });
  };

  const handlePublishDateChange = async (value: string) => {
    setPublishDate(value);
    await onUpdate({ publish_date: value });
  };

  const handlePublishTimeChange = async (value: string) => {
    setPublishTime(value);
    await onUpdate({ publish_time: value });
  };

  const handleDeadlineChange = async (value: string) => {
    setDeadline(value);
    await onUpdate({ deadline: value });
  };

  const handleDeadlineTimeChange = async (value: string) => {
    setDeadlineTime(value);
    await onUpdate({ deadline_time: value });
  };

  const handleBriefingBlur = async () => {
    await onUpdate({ description: briefing });
  };

  const handleCopyBlur = async () => {
    await onUpdate({ copy });
  };

  // Função para obter nome do responsável
  const getResponsibleName = () => {
    if (!assignedTo) return 'Sem responsável';
    const emp = creativeEmployees.find(e => e.id === assignedTo);
    return emp?.name || 'Sem responsável';
  };

  // Função para verificar se está atrasado
  const isOverdue = () => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };

  // Formatar horário para hh:mm (remover segundos se houver)
  const formatTime = (time: string) => {
    if (!time) return '';
    // Se tiver formato hh:mm:ss, pegar apenas hh:mm
    if (time.includes(':') && time.split(':').length === 3) {
      return time.split(':').slice(0, 2).join(':');
    }
    return time;
  };

  // Mapear status para texto e cor
  const getStatusInfo = (statusValue?: Content['status']) => {
    const currentStatus = statusValue || status;
    const statusMap: Record<Content['status'], { label: string; bgColor: string; textColor: string; borderColor: string; solidBorderColor: string; icon: React.ComponentType<{ className?: string }> }> = {
      'draft': { 
        label: 'Não iniciado', 
        bgColor: 'bg-gray-500/20', 
        textColor: 'text-gray-600',
        borderColor: 'border-gray-600',
        solidBorderColor: '#6b7280',
        icon: PencilIcon
      },
      'production': { 
        label: 'Em Produção', 
        bgColor: 'bg-blue-500/20', 
        textColor: 'text-blue-600',
        borderColor: 'border-blue-600',
        solidBorderColor: '#3b82f6',
        icon: SparklesIcon
      },
      'pending': { 
        label: 'Em Aprovação', 
        bgColor: 'bg-yellow-500/20', 
        textColor: 'text-yellow-600',
        borderColor: 'border-yellow-600',
        solidBorderColor: '#ca8a04',
        icon: EyeIcon
      },
      'approved': { 
        label: 'Aprovado', 
        bgColor: 'bg-green-500/20', 
        textColor: 'text-green-600',
        borderColor: 'border-green-600',
        solidBorderColor: '#22c55e',
        icon: CheckCircleIcon
      },
      'revision': { 
        label: 'Refação', 
        bgColor: 'bg-orange-500/20', 
        textColor: 'text-orange-600',
        borderColor: 'border-orange-600',
        solidBorderColor: '#f97316',
        icon: ExclamationCircleIcon
      },
      'rejected': { 
        label: 'Reprovado', 
        bgColor: 'bg-red-500/20', 
        textColor: 'text-red-600',
        borderColor: 'border-red-600',
        solidBorderColor: '#ef4444',
        icon: NoSymbolIcon
      },
      'published': { 
        label: 'Publicado', 
        bgColor: 'bg-sky-500/20', 
        textColor: 'text-sky-600',
        borderColor: 'border-sky-600',
        solidBorderColor: '#0ea5e9',
        icon: PaperAirplaneIcon
      },
    };
    return statusMap[currentStatus] || statusMap['draft'];
  };

  // Salvar título com debounce
  const handleTitleChange = (value: string) => {
    setTitle(value);
  };

  const handleTitleBlur = async () => {
    if (title !== content.title) {
      await onUpdate({ title });
    }
  };

  const handleSave = async () => {
    await onUpdate({
      title,
      client_id: clientId || null,
      status,
      files,
      links,
    } as any);
  };

  const [commentImage, setCommentImage] = useState<string | null>(null);
  const [commentImageFile, setCommentImageFile] = useState<File | null>(null);
  const [isSendingComment, setIsSendingComment] = useState(false);
  const commentImageInputRef = useRef<HTMLInputElement>(null);

  const handleCommentImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCommentImageFile(file);
      setCommentImage(URL.createObjectURL(file));
    }
  };

  const removeCommentImage = () => {
    if (commentImage) {
      URL.revokeObjectURL(commentImage);
    }
    setCommentImage(null);
    setCommentImageFile(null);
    if (commentImageInputRef.current) {
      commentImageInputRef.current.value = '';
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim() && !commentImageFile) return;

    setIsSendingComment(true);
    try {
      let imageUrl: string | undefined;
      
      // Upload da imagem se houver
      if (commentImageFile) {
        imageUrl = await uploadFile(commentImageFile, `comments/${content.id}`) || undefined;
      }

      await createComment({
        content_id: content.id,
        user_id: user?.id,
        message: newComment.trim() || (imageUrl ? '📷 Imagem' : ''),
        image: imageUrl,
      } as any);
      
      setNewComment('');
      removeCommentImage();
    } catch (error) {
      console.error('Erro ao enviar comentário:', error);
      toast.error('Erro ao enviar comentário');
    } finally {
      setIsSendingComment(false);
    }
  };

  const getUserName = (userId?: string) => {
    if (!userId) return 'Usuário';
    
    // Buscar funcionário pelo user_id (ID do Supabase Auth)
    const employee = employees?.find(e => e.user_id === userId);
    if (employee?.name) return employee.name;
    
    // Se for o usuário atual e não encontrou funcionário, usar dados do Auth
    if (userId === user?.id) {
      // Tentar buscar pelo email do usuário atual
      const employeeByEmail = employees?.find(e => e.email === user?.email);
      if (employeeByEmail?.name) return employeeByEmail.name;
      
      // Usar nome do metadata ou email
      return user?.user_metadata?.name || user?.email?.split('@')[0] || 'Você';
    }
    
    return 'Usuário';
  };

  const isImage = (url: string) => {
    return /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(url) || url.startsWith('data:image/');
  };

  const isVideo = (url: string) => {
    return /\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(url) || url.startsWith('data:video/');
  };

  const downloadFile = async (url: string, filename: string) => {
    try {
      if (url.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
      toast.error('Erro ao baixar arquivo');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-[1400px] bg-card rounded-2xl shadow-xl border border-border animate-scale-in overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between p-8 pb-2">
          <div className="flex items-center gap-8">
            <h1 className="text-4xl font-bold">
              {title}
            </h1>
            <span className="px-4 py-2 rounded-full bg-purple-100 text-purple-700 text-sm font-medium whitespace-nowrap">
              {clientId ? clients.find(c => c.id === clientId)?.name || 'Sem cliente' : 'Sem cliente'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Coluna Esquerda */}
          <div className="flex-1 p-8 overflow-y-auto">
            <div className="space-y-6">
              {/* Info Bar */}
              <div className="flex items-end gap-8 flex-wrap pb-6 border-b border-border">
                {/* Tipo */}
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground block mb-2">Tipo</span>
                  <Select value={contentType || 'none'} onValueChange={(value) => {
                    const newValue = value === 'none' ? '' : value;
                    handleContentTypeChange(newValue);
                  }}>
                    <SelectTrigger className="font-medium bg-black/5 border-0 h-auto px-3 py-0 focus:ring-0 min-w-[100px] h-[28px]">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem tipo</SelectItem>
                      {Object.entries(CONTENT_TYPES).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground block mb-2">Status</span>
                  <Select value={status} onValueChange={(value: Content['status']) => {
                    setStatus(value);
                    onUpdate({ status: value });
                  }}>
                    <SelectTrigger className={cn(
                      "font-medium border-0 h-[28px]  px-3 focus:ring-0 min-w-[120px] rounded-full flex items-center justify-center",
                      getStatusInfo(status).bgColor
                    )}>
                      <SelectValue>
                        {(() => {
                          const info = getStatusInfo(status);
                          const Icon = info.icon;
                          return (
                            <span className={cn(
                              "inline-flex items-center justify-center gap-2 text-sm font-medium",
                              info.textColor
                            )}>
                              <Icon className="w-4 h-4 flex-shrink-0" />
                              {info.label}
                            </span>
                          );
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="p-1 min-w-[180px]">
                      <div className="flex flex-col gap-[8px]">
                        {(['draft', 'production', 'pending', 'revision', 'approved', 'rejected'] as Content['status'][]).map((statusOption) => {
                          const info = getStatusInfo(statusOption);
                          const Icon = info.icon;
                          const isHovered = hoveredStatus === statusOption;
                          return (
                            <SelectItem 
                              key={statusOption} 
                              value={statusOption}
                              className="p-0 pl-0 focus:bg-transparent data-[highlighted]:bg-transparent [&>span:first-child]:hidden"
                              onMouseEnter={() => setHoveredStatus(statusOption)}
                              onMouseLeave={() => setHoveredStatus(null)}
                            >
                              <span 
                                className={cn(
                                  "inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-all min-w-[140px]",
                                  info.bgColor,
                                  info.textColor,
                                  "border-2 border-transparent"
                                )}
                                style={{
                                  borderColor: (isHovered || status === statusOption) ? info.solidBorderColor : 'transparent'
                                }}
                              >
                                <Icon className="w-4 h-4 flex-shrink-0" />
                                {info.label}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </div>
                    </SelectContent>
                  </Select>
                </div>

                {/* Data de publicação */}
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground block mb-2">Data de publicação</span>
                  <div className="flex items-center gap-1 text-sm font-medium h-[28px]">
                    {publishDate && (
                      <span>{format(new Date(publishDate), "dd 'de' MMM.", { locale: ptBR })} {publishTime}</span>
                    )}
                    {!publishDate && <span className="text-muted-foreground">Não definida</span>}
                    <input
                      type="date"
                      value={publishDate}
                      onChange={(e) => handlePublishDateChange(e.target.value)}
                      className="absolute opacity-0 w-0 h-0"
                    />
                    <input
                      type="time"
                      value={publishTime}
                      onChange={(e) => handlePublishTimeChange(e.target.value)}
                      className="absolute opacity-0 w-0 h-0"
                    />
                  </div>
                </div>

                {/* Prazo de entrega */}
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground block mb-2">Prazo de entrega</span>
                  <div className="flex items-center gap-2 h-[28px]">
                    {deadline && (
                      <span className="text-sm font-medium">
                        {format(new Date(deadline), "dd 'de' MMM", { locale: ptBR })}
                        {deadlineTime && ` às ${formatTime(deadlineTime)}`}
                      </span>
                    )}
                    {!deadline && <span className="text-sm text-muted-foreground">Não definido</span>}
                    {isOverdue() && (
                      <span className="px-2 py-1 rounded bg-red-500 text-white text-xs font-medium">
                        Em Atraso
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Briefing */}
              <div>
                <label className="block text-sm font-semibold mb-3">Briefing</label>
                <div className="relative">
                  <textarea
                    value={briefing}
                    onChange={(e) => setBriefing(e.target.value)}
                    onBlur={handleBriefingBlur}
                    rows={6}
                    className="w-full px-4 py-3 bg-muted/50 rounded-lg border border-border outline-none focus:ring-2 focus:ring-primary/20 resize-none text-sm"
                    placeholder="Descreva o briefing do conteúdo..."
                  />
                  <button
                    onClick={() => setBriefingExpanded(true)}
                    className="absolute bottom-3 right-3 p-1.5 bg-background/80 backdrop-blur-sm rounded-lg hover:bg-background transition-colors"
                    title="Expandir briefing"
                  >
                    <ArrowsPointingOutIcon className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Legenda */}
              <div>
                <label className="block text-sm font-semibold mb-3">Legenda</label>
                <div className="relative">
                  <textarea
                    value={copy}
                    onChange={(e) => setCopy(e.target.value)}
                    onBlur={handleCopyBlur}
                    rows={4}
                    className="w-full px-4 py-3 bg-muted/50 rounded-lg border border-border outline-none focus:ring-2 focus:ring-primary/20 resize-none text-sm"
                    placeholder="Escreva a legenda..."
                  />
                  <button
                    onClick={() => setCopyExpanded(true)}
                    className="absolute bottom-3 right-3 p-1.5 bg-background/80 backdrop-blur-sm rounded-lg hover:bg-background transition-colors"
                    title="Expandir legenda"
                  >
                    <ArrowsPointingOutIcon className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Anexos */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <h3 className="text-sm font-semibold">Anexos</h3>
                </div>

                {/* Tabs */}
                <div className="flex gap-8 border-b border-border mb-4">
                  <button
                    onClick={() => setActiveAttachmentTab('references')}
                    className={cn(
                      "pb-3 text-sm font-medium border-b-2 transition-colors",
                      activeAttachmentTab === 'references'
                        ? "border-foreground text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Referências
                  </button>
                  <button
                    onClick={() => setActiveAttachmentTab('final')}
                    className={cn(
                      "pb-3 text-sm font-medium border-b-2 transition-colors",
                      activeAttachmentTab === 'final'
                        ? "border-foreground text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Material finalizado
                  </button>
                </div>

                {/* Tab Content - Referências */}
                {activeAttachmentTab === 'references' && (
                  <div className="space-y-4">
                    {/* Arquivos de Referência */}
                    <div className="space-y-2">
                      <span className="text-sm font-medium">Arquivos</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*,video/*,.pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors text-sm w-full justify-center disabled:opacity-50"
                      >
                        {isUploading ? (
                          <>
                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <ArrowUpTrayIcon className="w-4 h-4" />
                            Upload de arquivo
                          </>
                        )}
                      </button>

                      {files.length > 0 && (
                        <div className="space-y-2 mt-3">
                          {files.map((file, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg group hover:bg-muted/50 transition-colors">
                              <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0 bg-muted">
                                {isImage(file) ? (
                                  <img
                                    src={file}
                                    alt=""
                                    className="w-full h-full object-cover cursor-pointer"
                                    onClick={() => setFullscreenIndex(index)}
                                  />
                                ) : isVideo(file) ? (
                                  <video
                                    src={file}
                                    className="w-full h-full object-cover cursor-pointer"
                                    onClick={() => setFullscreenIndex(index)}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <DocumentIcon className="w-6 h-6 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {file.split('/').pop()?.split('?')[0] || `Arquivo ${index + 1}`}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Adicionado em {format(new Date(), "dd 'de' MMM. 'de' yyyy, HH:mm", { locale: ptBR })}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => window.open(file, '_blank')}
                                  className="p-1 hover:bg-background rounded"
                                >
                                  <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => removeFile(index)}
                                  className="p-1 hover:bg-background rounded"
                                >
                                  <EllipsisVerticalIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Links de Referência */}
                    <div className="space-y-2">
                      <span className="text-sm font-medium">Links</span>
                      <div className="space-y-2">
                        {links.map((link, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg group hover:bg-muted/50 transition-colors">
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 text-sm text-primary hover:underline truncate"
                            >
                              {link}
                            </a>
                            <button
                              onClick={() => removeLink(index)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-background rounded"
                            >
                              <EllipsisVerticalIcon className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={newLink}
                            onChange={(e) => setNewLink(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addLink()}
                            placeholder="https://..."
                            className="flex-1 px-3 py-2 bg-muted/50 rounded-lg border border-border outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                          />
                          <button
                            onClick={addLink}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
                          >
                            Adicionar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab Content - Material finalizado */}
                {activeAttachmentTab === 'final' && (
                  <div className="space-y-4">
                    {/* Arquivos de Material Finalizado */}
                    <div className="space-y-2">
                      <span className="text-sm font-medium">Arquivos</span>
                      <input
                        ref={contentFileInputRef}
                        type="file"
                        multiple
                        accept="image/*,video/*"
                        onChange={handleContentFileChange}
                        className="hidden"
                      />
                      <button
                        onClick={() => contentFileInputRef.current?.click()}
                        disabled={isUploadingContentFiles}
                        className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors text-sm w-full justify-center disabled:opacity-50"
                      >
                        {isUploadingContentFiles ? (
                          <>
                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <ArrowUpTrayIcon className="w-4 h-4" />
                            Upload de arquivo
                          </>
                        )}
                      </button>

                      {contentFiles.length > 0 && (
                        <div className="space-y-2 mt-3">
                          {contentFiles.map((file, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg group hover:bg-muted/50 transition-colors">
                              <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0 bg-muted">
                                {isImage(file) ? (
                                  <img
                                    src={file}
                                    alt=""
                                    className="w-full h-full object-cover cursor-pointer"
                                    onClick={() => setContentFullscreenIndex(index)}
                                  />
                                ) : isVideo(file) ? (
                                  <video
                                    src={file}
                                    className="w-full h-full object-cover cursor-pointer"
                                    onClick={() => setContentFullscreenIndex(index)}
                                  />
                                ) : null}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {file.split('/').pop()?.split('?')[0] || `Arquivo ${index + 1}`}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Adicionado em {format(new Date(), "dd 'de' MMM. 'de' yyyy, HH:mm", { locale: ptBR })}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => window.open(file, '_blank')}
                                  className="p-1 hover:bg-background rounded"
                                >
                                  <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => removeContentFile(index)}
                                  className="p-1 hover:bg-background rounded"
                                >
                                  <EllipsisVerticalIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Links de Material Finalizado */}
                    <div className="space-y-2">
                      <span className="text-sm font-medium">Links</span>
                      <div className="space-y-2">
                        {finalizedLinks.map((link, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg group hover:bg-muted/50 transition-colors">
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 text-sm text-primary hover:underline truncate"
                            >
                              {link}
                            </a>
                            <button
                              onClick={() => removeFinalizedLink(index)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-background rounded"
                            >
                              <EllipsisVerticalIcon className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={newFinalizedLink}
                            onChange={(e) => setNewFinalizedLink(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addFinalizedLink()}
                            placeholder="https://... (ex: link do Google Drive)"
                            className="flex-1 px-3 py-2 bg-muted/50 rounded-lg border border-border outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                          />
                          <button
                            onClick={addFinalizedLink}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
                          >
                            Adicionar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Coluna Direita - Comentários */}
          <div className="w-[400px] border-l border-border flex flex-col">
            <div className="p-6 border-b border-border">
              <h3 className="font-semibold">Comentários</h3>
            </div>

            {/* Lista de Comentários */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {comments?.map(comment => (
                <div key={comment.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">
                      {getUserName(comment.user_id)?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{getUserName(comment.user_id)}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(comment.created_at), "dd 'de' MMM. 'de' yyyy, HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  
                  {comment.message && comment.message !== '📷 Imagem' && (
                    <p className="text-sm text-foreground pl-10">{comment.message}</p>
                  )}
                  
                  {comment.image && (
                    <div className="pl-10">
                      <img
                        src={comment.image}
                        alt="Anexo"
                        className="max-w-full max-h-48 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(comment.image, '_blank')}
                      />
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Input de Comentário */}
            <div className="p-6 border-t border-border space-y-3">
              {commentImage && (
                <div className="relative inline-block">
                  <img
                    src={commentImage}
                    alt="Preview"
                    className="h-20 w-auto rounded-lg border border-border"
                  />
                  <button
                    onClick={removeCommentImage}
                    className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                  >
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  ref={commentImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCommentImageChange}
                  className="hidden"
                />
                
                <button
                  onClick={() => commentImageInputRef.current?.click()}
                  className="p-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                  title="Anexar imagem"
                >
                  <PhotoIcon className="w-5 h-5 text-muted-foreground" />
                </button>

                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendComment()}
                  placeholder="Escrever um comentário..."
                  className="flex-1 px-4 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                />

                <button
                  onClick={handleSendComment}
                  disabled={isSendingComment || (!newComment.trim() && !commentImageFile)}
                  className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSendingComment ? (
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                  ) : (
                    <PaperAirplaneIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal de Tela Cheia para Referências */}
        {fullscreenIndex !== null && files[fullscreenIndex] && (
          <FullscreenGallery
            files={files}
            currentIndex={fullscreenIndex}
            onClose={() => setFullscreenIndex(null)}
            onNavigate={setFullscreenIndex}
            isImage={isImage}
            isVideo={isVideo}
          />
        )}

        {/* Modal de Tela Cheia para Material Finalizado */}
        {contentFullscreenIndex !== null && contentFiles[contentFullscreenIndex] && (
          <FullscreenGallery
            files={contentFiles}
            currentIndex={contentFullscreenIndex}
            onClose={() => setContentFullscreenIndex(null)}
            onNavigate={setContentFullscreenIndex}
            isImage={isImage}
            isVideo={isVideo}
          />
        )}

        {/* Modal de Briefing Expandido */}
        {briefingExpanded && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
              onClick={() => setBriefingExpanded(false)}
            />
            <div className="relative w-full max-w-4xl bg-card rounded-2xl shadow-xl border border-border overflow-hidden flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-xl font-semibold">Briefing</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(briefing);
                      toast.success('Briefing copiado!');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium flex items-center gap-2"
                  >
                    <DocumentIcon className="w-4 h-4" />
                    Copiar
                  </button>
                  <button
                    onClick={() => setBriefingExpanded(false)}
                    className="p-1 rounded-lg hover:bg-muted transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
              </div>
              <div className="flex-1 p-6 overflow-y-auto">
                <textarea
                  value={briefing}
                  onChange={(e) => setBriefing(e.target.value)}
                  onBlur={handleBriefingBlur}
                  rows={20}
                  className="w-full h-full px-4 py-3 bg-muted/50 rounded-lg border border-border outline-none focus:ring-2 focus:ring-primary/20 resize-none text-sm min-h-[500px]"
                  placeholder="Descreva o briefing do conteúdo..."
                />
              </div>
            </div>
          </div>
        )}

        {/* Modal de Legenda Expandida */}
        {copyExpanded && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
              onClick={() => setCopyExpanded(false)}
            />
            <div className="relative w-full max-w-4xl bg-card rounded-2xl shadow-xl border border-border overflow-hidden flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-xl font-semibold">Legenda</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(copy);
                      toast.success('Legenda copiada!');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium flex items-center gap-2"
                  >
                    <DocumentIcon className="w-4 h-4" />
                    Copiar
                  </button>
                  <button
                    onClick={() => setCopyExpanded(false)}
                    className="p-1 rounded-lg hover:bg-muted transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
              </div>
              <div className="flex-1 p-6 overflow-y-auto">
                <textarea
                  value={copy}
                  onChange={(e) => setCopy(e.target.value)}
                  onBlur={handleCopyBlur}
                  rows={20}
                  className="w-full h-full px-4 py-3 bg-muted/50 rounded-lg border border-border outline-none focus:ring-2 focus:ring-primary/20 resize-none text-sm min-h-[500px]"
                  placeholder="Escreva a legenda..."
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

