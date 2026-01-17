import { useState, useEffect, useRef } from 'react';
import { Check, X, MessageSquare, Send, Image, Video, Plus, User, Filter, Upload, Link, FileVideo, FileImage, Clock, CheckCircle, XCircle } from 'lucide-react';
import { getFromStorage, saveToStorage, Content, Client, Employee, Comment, generateId } from '@/lib/storage';
import { Modal } from '@/components/ui/modal';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ApprovalsPageProps {
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

const statusFilters = [
  { value: 'all', label: 'Todos', color: 'bg-muted text-muted-foreground' },
  { value: 'pending', label: 'Em Aprovação', color: 'bg-warning/20 text-warning' },
  { value: 'approved', label: 'Aprovados', color: 'bg-success/20 text-success' },
  { value: 'rejected', label: 'Reprovados', color: 'bg-destructive/20 text-destructive' },
];

export function ApprovalsPage({ searchQuery }: ApprovalsPageProps) {
  const [contents, setContents] = useState<Content[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [newComment, setNewComment] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentUser] = useState({ id: 'current-user', name: 'Você' });
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Form state for new content
  const [formData, setFormData] = useState({
    clientId: '',
    title: '',
    file: null as File | null,
    fileUrl: '',
    uploadType: 'file' as 'file' | 'link',
  });

  useEffect(() => {
    setContents(getFromStorage<Content>('contents'));
    setClients(getFromStorage<Client>('clients'));
    setEmployees(getFromStorage<Employee>('employees'));
    setComments(getFromStorage<Comment>('comments'));
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments, selectedContent]);

  // Filter employees that are Designers or Video Editors
  const creativeEmployees = employees.filter(e => 
    e.status === 'active' && 
    (e.role.toLowerCase().includes('designer') || 
     e.role.toLowerCase().includes('editor') ||
     e.role.toLowerCase().includes('vídeo') ||
     e.role.toLowerCase().includes('video'))
  );

  // Filter contents based on selected employee and status
  const getEmployeeContents = (employeeId: string) => {
    return contents.filter(c => {
      const matchesEmployee = c.responsibleId === employeeId;
      const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'pending' && c.status === 'pending') ||
        (statusFilter === 'approved' && c.status === 'approved') ||
        (statusFilter === 'rejected' && (c.status === 'production' || c.status === 'draft'));
      return matchesEmployee && matchesSearch && matchesStatus;
    });
  };

  const getClientName = (id: string) => clients.find(c => c.id === id)?.name || 'Cliente';
  const getClientColor = (id: string) => clients.find(c => c.id === id)?.color || '#3B82F6';
  const getEmployee = (id: string) => employees.find(e => e.id === id);
  const getEmployeeName = (id: string) => getEmployee(id)?.name || 'Não atribuído';

  const getContentComments = (contentId: string) => {
    return comments.filter(c => c.contentId === contentId).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getContentCountByStatus = (employeeId: string, status: string) => {
    return contents.filter(c => {
      if (status === 'pending') return c.responsibleId === employeeId && c.status === 'pending';
      if (status === 'approved') return c.responsibleId === employeeId && c.status === 'approved';
      if (status === 'rejected') return c.responsibleId === employeeId && (c.status === 'production' || c.status === 'draft');
      return c.responsibleId === employeeId;
    }).length;
  };

  const handleApprove = (content: Content) => {
    const updatedContents = contents.map(c =>
      c.id === content.id ? { ...c, status: 'approved' as const } : c
    );
    setContents(updatedContents);
    saveToStorage('contents', updatedContents);
    
    const comment: Comment = {
      id: generateId(),
      contentId: content.id,
      userId: 'system',
      userName: 'Sistema',
      message: '✅ Conteúdo aprovado!',
      createdAt: new Date().toISOString(),
      read: true,
    };
    const updatedComments = [...comments, comment];
    setComments(updatedComments);
    saveToStorage('comments', updatedComments);
    
    toast.success('Conteúdo aprovado!');
    setSelectedContent(null);
  };

  const handleReject = (content: Content) => {
    const updatedContents = contents.map(c =>
      c.id === content.id ? { ...c, status: 'rejected' as const } : c
    );
    setContents(updatedContents);
    saveToStorage('contents', updatedContents);
    
    const comment: Comment = {
      id: generateId(),
      contentId: content.id,
      userId: 'system',
      userName: 'Sistema',
      message: '❌ Conteúdo reprovado.',
      createdAt: new Date().toISOString(),
      read: true,
    };
    const updatedComments = [...comments, comment];
    setComments(updatedComments);
    saveToStorage('comments', updatedComments);
    
    toast.success('Conteúdo reprovado');
    setSelectedContent(null);
  };

  const handleAddComment = () => {
    if (!newComment.trim() || !selectedContent) return;

    const comment: Comment = {
      id: generateId(),
      contentId: selectedContent.id,
      userId: currentUser.id,
      userName: currentUser.name,
      message: newComment,
      createdAt: new Date().toISOString(),
      read: false,
    };

    const updatedComments = [...comments, comment];
    setComments(updatedComments);
    saveToStorage('comments', updatedComments);
    setNewComment('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (100MB = 104857600 bytes)
      if (file.size > 104857600) {
        toast.error('Arquivo muito grande. Máximo permitido: 100MB');
        return;
      }
      setFormData({ ...formData, file });
    }
  };

  const handleCreateContent = () => {
    if (!formData.title || !formData.clientId || !selectedEmployee) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (formData.uploadType === 'file' && !formData.file) {
      toast.error('Selecione um arquivo');
      return;
    }

    if (formData.uploadType === 'link' && !formData.fileUrl) {
      toast.error('Insira um link válido');
      return;
    }

    const fileName = formData.uploadType === 'file' 
      ? formData.file?.name || '' 
      : formData.fileUrl;

    const newContent: Content = {
      id: generateId(),
      clientId: formData.clientId,
      type: 'post',
      title: formData.title,
      description: '',
      publishDate: new Date().toISOString().split('T')[0],
      publishTime: '12:00',
      socialNetwork: 'instagram',
      responsibleId: selectedEmployee.id,
      status: 'pending',
      files: [fileName],
      copy: '',
      hashtags: [],
      createdAt: new Date().toISOString(),
    };

    const updatedContents = [...contents, newContent];
    setContents(updatedContents);
    saveToStorage('contents', updatedContents);
    
    setFormData({
      clientId: '',
      title: '',
      file: null,
      fileUrl: '',
      uploadType: 'file',
    });
    setShowCreateModal(false);
    toast.success('Conteúdo criado e enviado para aprovação!');
  };

  const renderContentPreview = (content: Content) => {
    const isVideo = content.type === 'reels' || content.type === 'tiktok' || content.type === 'stories';
    const isCarousel = content.type === 'carousel';

    return (
      <div className="h-full flex flex-col">
        <div 
          className="flex-1 rounded-xl flex items-center justify-center relative overflow-hidden"
          style={{ backgroundColor: `${getClientColor(content.clientId)}10` }}
        >
          {isVideo ? (
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Video className="w-12 h-12 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-2">Vídeo: {contentTypes[content.type]}</p>
              {content.files.length > 0 && (
                <p className="text-xs text-muted-foreground/70">{content.files[0]}</p>
              )}
              <div className="mt-4 bg-muted/50 rounded-lg p-3 mx-auto max-w-xs">
                <div className="flex items-center gap-3">
                  <button className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    ▶
                  </button>
                  <div className="flex-1 h-1 bg-muted-foreground/20 rounded-full">
                    <div className="w-1/3 h-full bg-primary rounded-full"></div>
                  </div>
                  <span className="text-xs text-muted-foreground">0:15</span>
                </div>
              </div>
            </div>
          ) : isCarousel ? (
            <div className="text-center">
              <div className="flex gap-2 justify-center mb-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                    <Image className="w-8 h-8 text-muted-foreground" />
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">Carrossel ({content.files.length || 3} slides)</p>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 rounded-xl bg-muted flex items-center justify-center">
                <Image className="w-12 h-12 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-2">{contentTypes[content.type]}</p>
              {content.files.length > 0 && (
                <p className="text-xs text-muted-foreground/70">{content.files[0]}</p>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 space-y-3">
          <div className="p-3 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-medium text-foreground mb-1">Legenda</h4>
            <p className="text-sm text-muted-foreground">{content.copy || 'Sem legenda'}</p>
          </div>
          
          {content.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {content.hashtags.map(tag => (
                <span key={tag} className="text-xs text-primary">#{tag}</span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="px-2 py-1 bg-muted rounded">📱 {socialNetworks[content.socialNetwork]}</span>
            <span className="px-2 py-1 bg-muted rounded">📅 {format(new Date(content.publishDate), "dd/MM/yyyy")}</span>
            <span className="px-2 py-1 bg-muted rounded">🕐 {content.publishTime}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Status Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        {statusFilters.map(filter => (
          <button
            key={filter.value}
            onClick={() => setStatusFilter(filter.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              statusFilter === filter.value 
                ? filter.color + ' ring-2 ring-offset-2 ring-offset-background ring-primary/30'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Employee Cards Grid */}
      {creativeEmployees.length === 0 ? (
        <EmptyState
          icon={User}
          title="Nenhum designer ou editor cadastrado"
          description="Cadastre funcionários com o cargo de Designer ou Editor de Vídeo para ver seus conteúdos aqui."
        />
      ) : (
        <div className="flex flex-wrap gap-3">
          {creativeEmployees.map(employee => {
            const pendingCount = getContentCountByStatus(employee.id, 'pending');
            const approvedCount = getContentCountByStatus(employee.id, 'approved');
            const rejectedCount = getContentCountByStatus(employee.id, 'rejected');
            const isSelected = selectedEmployee?.id === employee.id;

            return (
              <div
                key={employee.id}
                onClick={() => setSelectedEmployee(isSelected ? null : employee)}
                className={`flex-1 min-w-[220px] max-w-[320px] bg-card rounded-xl border p-4 cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-primary ring-2 ring-primary/20 shadow-lg' 
                    : 'border-border hover:border-primary/50 hover:shadow-md'
                }`}
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
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-warning/30">
                    <Clock className="w-3.5 h-3.5 text-warning" />
                    <span className="text-xs font-medium text-warning">{pendingCount}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-success/30">
                    <CheckCircle className="w-3.5 h-3.5 text-success" />
                    <span className="text-xs font-medium text-success">{approvedCount}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-destructive/30">
                    <XCircle className="w-3.5 h-3.5 text-destructive" />
                    <span className="text-xs font-medium text-destructive">{rejectedCount}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Employee Contents */}
      {selectedEmployee && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-semibold text-sm">
                {getInitials(selectedEmployee.name)}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Conteúdos de {selectedEmployee.name}</h2>
                <p className="text-sm text-muted-foreground">{selectedEmployee.role}</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Criar Conteúdo</span>
            </button>
          </div>

          {getEmployeeContents(selectedEmployee.id).length === 0 ? (
            <EmptyState
              icon={Image}
              title="Nenhum conteúdo encontrado"
              description={`${selectedEmployee.name} ainda não tem conteúdos ${statusFilter !== 'all' ? 'com este status' : ''}.`}
              action={{
                label: 'Criar Conteúdo',
                onClick: () => setShowCreateModal(true),
              }}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {getEmployeeContents(selectedEmployee.id).map(content => (
                <div 
                  key={content.id} 
                  onClick={() => setSelectedContent(content)}
                  className="bg-card rounded-xl border border-border overflow-hidden card-hover cursor-pointer"
                >
                  <div 
                    className="h-40 flex items-center justify-center"
                    style={{ backgroundColor: `${getClientColor(content.clientId)}15` }}
                  >
                    <div className="text-center">
                      <span className="text-4xl mb-2 block">
                        {content.type === 'reels' || content.type === 'tiktok' ? '🎬' : 
                         content.type === 'carousel' ? '🎨' : '📷'}
                      </span>
                      <span className="text-sm text-muted-foreground">{contentTypes[content.type]}</span>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">{getClientName(content.clientId)}</p>
                        <h3 className="font-semibold text-card-foreground truncate">{content.title}</h3>
                      </div>
                      <StatusBadge 
                        status={content.status === 'production' || content.status === 'draft' ? 'rejected' : content.status} 
                        type="content" 
                      />
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                      <span>{socialNetworks[content.socialNetwork]}</span>
                      <span>•</span>
                      <span>{format(new Date(content.publishDate), "dd 'de' MMM", { locale: ptBR })}</span>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2">{content.copy}</p>

                    {getContentComments(content.id).length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MessageSquare className="w-3 h-3" />
                          {getContentComments(content.id).length} comentário(s)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content Detail Modal with Chat */}
      <Modal
        isOpen={!!selectedContent}
        onClose={() => { setSelectedContent(null); setNewComment(''); }}
        title=""
        size="xl"
      >
        {selectedContent && (
          <div className="flex flex-col lg:flex-row gap-6 h-[70vh] min-h-[500px]">
            {/* Left Column - Content Preview */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: getClientColor(selectedContent.clientId) }}
                  />
                  <span className="text-sm text-muted-foreground">{getClientName(selectedContent.clientId)}</span>
                </div>
                <h3 className="text-lg font-bold text-foreground">{selectedContent.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={selectedContent.status} type="content" />
                  <span className="text-xs text-muted-foreground">• {contentTypes[selectedContent.type]}</span>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                {renderContentPreview(selectedContent)}
              </div>

              {selectedContent.status === 'pending' && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                  <button
                    onClick={() => handleApprove(selectedContent)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-success text-success-foreground rounded-lg font-medium hover:bg-success/90 transition-colors"
                  >
                    <Check className="w-4 h-4" /> Aprovar
                  </button>
                  <button
                    onClick={() => handleReject(selectedContent)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-destructive text-destructive-foreground rounded-lg font-medium hover:bg-destructive/90 transition-colors"
                  >
                    <X className="w-4 h-4" /> Reprovar
                  </button>
                </div>
              )}
            </div>

            {/* Right Column - Chat */}
            <div className="flex-1 flex flex-col bg-muted/30 rounded-xl border border-border overflow-hidden">
              <div className="p-4 bg-muted border-b border-border">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Chat de Aprovação
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Converse com {getEmployeeName(selectedContent.responsibleId)} sobre este conteúdo
                </p>
              </div>

              <div className="px-4 py-2 border-b border-border flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Participantes:</span>
                <div className="flex -space-x-2">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center ring-2 ring-background">
                    {getInitials(currentUser.name)}
                  </div>
                  {getEmployee(selectedContent.responsibleId) && (
                    <div className="w-6 h-6 rounded-full bg-secondary text-secondary-foreground text-xs flex items-center justify-center ring-2 ring-background">
                      {getInitials(getEmployeeName(selectedContent.responsibleId))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {getContentComments(selectedContent.id).length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
                    <p className="text-sm">Nenhuma mensagem ainda</p>
                    <p className="text-xs">Inicie uma conversa sobre este conteúdo</p>
                  </div>
                ) : (
                  <>
                    {getContentComments(selectedContent.id).map(comment => {
                      const isCurrentUser = comment.userId === currentUser.id;
                      const isSystem = comment.userId === 'system';

                      if (isSystem) {
                        return (
                          <div key={comment.id} className="flex justify-center">
                            <div className="px-3 py-1.5 bg-muted rounded-full text-xs text-muted-foreground">
                              {comment.message}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={comment.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] ${isCurrentUser ? 'order-2' : ''}`}>
                            <div className={`flex items-end gap-2 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium shrink-0">
                                {getInitials(comment.userName)}
                              </div>
                              <div className={`rounded-2xl px-3 py-2 ${
                                isCurrentUser 
                                  ? 'bg-primary text-primary-foreground rounded-br-md' 
                                  : 'bg-muted text-foreground rounded-bl-md'
                              }`}>
                                <p className="text-sm">{comment.message}</p>
                              </div>
                            </div>
                            <p className={`text-xs text-muted-foreground mt-1 ${isCurrentUser ? 'text-right mr-8' : 'ml-8'}`}>
                              {format(new Date(comment.createdAt), "HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </>
                )}
              </div>

              <div className="p-4 border-t border-border bg-background">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 px-4 py-2 bg-muted rounded-lg text-sm outline-none focus:ring-2 ring-primary/30"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Content Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={`Novo Conteúdo - ${selectedEmployee?.name || ''}`}
        size="md"
      >
        <div className="space-y-5">
          {/* Cliente */}
          <div>
            <label className="block text-sm font-medium mb-2">Cliente *</label>
            <select
              value={formData.clientId}
              onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
              className="w-full px-3 py-2.5 bg-muted rounded-lg text-sm outline-none focus:ring-2 ring-primary/30"
            >
              <option value="">Selecione um cliente</option>
              {clients.filter(c => c.status === 'active').map(client => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </div>

          {/* Título */}
          <div>
            <label className="block text-sm font-medium mb-2">Título *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2.5 bg-muted rounded-lg text-sm outline-none focus:ring-2 ring-primary/30"
              placeholder="Título do conteúdo"
            />
          </div>

          {/* Upload Type Toggle */}
          <div>
            <label className="block text-sm font-medium mb-2">Upload de Arquivo *</label>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, uploadType: 'file', fileUrl: '' })}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  formData.uploadType === 'file'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <Upload className="w-4 h-4" />
                Arquivo
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, uploadType: 'link', file: null })}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  formData.uploadType === 'link'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <Link className="w-4 h-4" />
                Link
              </button>
            </div>

            {formData.uploadType === 'file' ? (
              <div className="relative">
                <input
                  type="file"
                  id="file-upload"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="file-upload"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/30 rounded-xl bg-muted/30 cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-all"
                >
                  {formData.file ? (
                    <div className="flex items-center gap-3 text-foreground">
                      {formData.file.type.startsWith('video/') ? (
                        <FileVideo className="w-8 h-8 text-primary" />
                      ) : (
                        <FileImage className="w-8 h-8 text-primary" />
                      )}
                      <div className="text-left">
                        <p className="text-sm font-medium truncate max-w-[200px]">{formData.file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(formData.file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Clique para selecionar ou arraste um arquivo</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">Máximo: 100MB (imagem ou vídeo)</p>
                    </>
                  )}
                </label>
              </div>
            ) : (
              <div className="relative">
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="url"
                  value={formData.fileUrl}
                  onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                  className="w-full pl-10 pr-3 py-2.5 bg-muted rounded-lg text-sm outline-none focus:ring-2 ring-primary/30"
                  placeholder="Ex: https://drive.google.com/file/..."
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreateContent}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Enviar para Aprovação
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
