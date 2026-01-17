import { useState, useEffect, useRef } from 'react';
import { Check, X, MessageSquare, Send, Image, Video, FileText, User } from 'lucide-react';
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

export function ApprovalsPage({ searchQuery }: ApprovalsPageProps) {
  const [contents, setContents] = useState<Content[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [newComment, setNewComment] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [currentUser] = useState({ id: 'current-user', name: 'Você' }); // Simular usuário atual
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setContents(getFromStorage<Content>('contents'));
    setClients(getFromStorage<Client>('clients'));
    setEmployees(getFromStorage<Employee>('employees'));
    setComments(getFromStorage<Comment>('comments'));
  }, []);

  // Scroll to bottom when new message is added
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments, selectedContent]);

  const pendingContents = contents.filter(c => {
    const matchesPending = c.status === 'pending';
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClient = !filterClient || c.clientId === filterClient;
    return matchesPending && matchesSearch && matchesClient;
  });

  const getClientName = (id: string) => clients.find(c => c.id === id)?.name || 'Cliente';
  const getClientColor = (id: string) => clients.find(c => c.id === id)?.color || '#3B82F6';
  const getEmployee = (id: string) => employees.find(e => e.id === id);
  const getEmployeeName = (id: string) => getEmployee(id)?.name || 'Não atribuído';

  const getContentComments = (contentId: string) => {
    return comments.filter(c => c.contentId === contentId).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  };

  const handleApprove = (content: Content) => {
    const updatedContents = contents.map(c =>
      c.id === content.id ? { ...c, status: 'approved' as const } : c
    );
    setContents(updatedContents);
    saveToStorage('contents', updatedContents);
    
    // Add system comment
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
      c.id === content.id ? { ...c, status: 'production' as const } : c
    );
    setContents(updatedContents);
    saveToStorage('contents', updatedContents);
    
    // Add system comment
    const comment: Comment = {
      id: generateId(),
      contentId: content.id,
      userId: 'system',
      userName: 'Sistema',
      message: '❌ Conteúdo reprovado. Devolvido para produção.',
      createdAt: new Date().toISOString(),
      read: true,
    };
    const updatedComments = [...comments, comment];
    setComments(updatedComments);
    saveToStorage('comments', updatedComments);
    
    toast.success('Conteúdo devolvido para produção');
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

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const renderContentPreview = (content: Content) => {
    const isVideo = content.type === 'reels' || content.type === 'tiktok' || content.type === 'stories';
    const isCarousel = content.type === 'carousel';

    return (
      <div className="h-full flex flex-col">
        {/* Preview area */}
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
              {/* Simulate video player controls */}
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

        {/* Content details */}
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
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
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
        <span className="text-sm text-muted-foreground">
          {pendingContents.length} conteúdo(s) pendente(s)
        </span>
      </div>

      {/* Pending Contents */}
      {pendingContents.length === 0 ? (
        <EmptyState
          icon={Check}
          title="Nenhuma aprovação pendente"
          description="Todos os conteúdos foram revisados! 🎉"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {pendingContents.map(content => (
            <div 
              key={content.id} 
              onClick={() => setSelectedContent(content)}
              className="bg-card rounded-xl border border-border overflow-hidden card-hover cursor-pointer"
            >
              {/* Preview placeholder */}
              <div 
                className="h-48 flex items-center justify-center"
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
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{getClientName(content.clientId)}</p>
                    <h3 className="font-semibold text-card-foreground">{content.title}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    {getContentComments(content.id).length > 0 && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-warning/10 text-warning text-xs rounded-full">
                        <MessageSquare className="w-3 h-3" />
                        {getContentComments(content.id).length}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  <span>{socialNetworks[content.socialNetwork]}</span>
                  <span>•</span>
                  <span>{format(new Date(content.publishDate), "dd 'de' MMM", { locale: ptBR })} às {content.publishTime}</span>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{content.copy}</p>

                <p className="text-xs text-muted-foreground">
                  Criado por: {getEmployeeName(content.responsibleId)}
                </p>
              </div>
            </div>
          ))}
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

              {/* Action Buttons */}
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
            </div>

            {/* Right Column - Chat */}
            <div className="flex-1 flex flex-col bg-muted/30 rounded-xl border border-border overflow-hidden">
              {/* Chat Header */}
              <div className="p-4 bg-muted border-b border-border">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Chat de Aprovação
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Converse com {getEmployeeName(selectedContent.responsibleId)} sobre este conteúdo
                </p>
              </div>

              {/* Participants */}
              <div className="px-4 py-2 border-b border-border flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Participantes:</span>
                <div className="flex -space-x-2">
                  {/* Current user */}
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center ring-2 ring-background">
                    {getInitials(currentUser.name)}
                  </div>
                  {/* Content responsible */}
                  {getEmployee(selectedContent.responsibleId) && (
                    <div className="w-6 h-6 rounded-full bg-secondary text-secondary-foreground text-xs flex items-center justify-center ring-2 ring-background">
                      {getInitials(getEmployeeName(selectedContent.responsibleId))}
                    </div>
                  )}
                  {/* Client responsible (from client data) */}
                  {clients.find(c => c.id === selectedContent.clientId)?.responsibleId && (
                    <div className="w-6 h-6 rounded-full bg-accent text-accent-foreground text-xs flex items-center justify-center ring-2 ring-background">
                      {getInitials(getEmployeeName(clients.find(c => c.id === selectedContent.clientId)?.responsibleId || ''))}
                    </div>
                  )}
                </div>
              </div>

              {/* Messages */}
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
                        <div 
                          key={comment.id} 
                          className={`flex items-end gap-2 ${isCurrentUser ? 'flex-row-reverse' : ''}`}
                        >
                          <div 
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                              isCurrentUser 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-secondary text-secondary-foreground'
                            }`}
                          >
                            {getInitials(comment.userName)}
                          </div>
                          <div 
                            className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                              isCurrentUser 
                                ? 'bg-primary text-primary-foreground rounded-br-sm' 
                                : 'bg-muted text-foreground rounded-bl-sm'
                            }`}
                          >
                            {!isCurrentUser && (
                              <p className="text-xs font-medium mb-1 opacity-70">{comment.userName}</p>
                            )}
                            <p className="text-sm">{comment.message}</p>
                            <p className={`text-[10px] mt-1 ${isCurrentUser ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                              {format(new Date(comment.createdAt), "HH:mm")}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </>
                )}
              </div>

              {/* Message Input */}
              <div className="p-4 bg-background border-t border-border">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 px-4 py-2.5 bg-muted rounded-full border-0 outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    className="p-2.5 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
