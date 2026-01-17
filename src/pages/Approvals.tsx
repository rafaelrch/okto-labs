import { useState, useEffect } from 'react';
import { Check, X, MessageSquare, Send, Filter } from 'lucide-react';
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

  useEffect(() => {
    setContents(getFromStorage<Content>('contents'));
    setClients(getFromStorage<Client>('clients'));
    setEmployees(getFromStorage<Employee>('employees'));
    setComments(getFromStorage<Comment>('comments'));
  }, []);

  const pendingContents = contents.filter(c => {
    const matchesPending = c.status === 'pending';
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClient = !filterClient || c.clientId === filterClient;
    return matchesPending && matchesSearch && matchesClient;
  });

  const getClientName = (id: string) => clients.find(c => c.id === id)?.name || 'Cliente';
  const getClientColor = (id: string) => clients.find(c => c.id === id)?.color || '#3B82F6';
  const getEmployeeName = (id: string) => employees.find(e => e.id === id)?.name || 'Não atribuído';

  const getContentComments = (contentId: string) => {
    return comments.filter(c => c.contentId === contentId).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  };

  const handleApprove = (content: Content) => {
    const updatedContents = contents.map(c =>
      c.id === content.id ? { ...c, status: 'approved' as const } : c
    );
    setContents(updatedContents);
    saveToStorage('contents', updatedContents);
    toast.success('Conteúdo aprovado!');
    setSelectedContent(null);
  };

  const handleReject = (content: Content) => {
    const updatedContents = contents.map(c =>
      c.id === content.id ? { ...c, status: 'production' as const } : c
    );
    setContents(updatedContents);
    saveToStorage('contents', updatedContents);
    toast.success('Conteúdo devolvido para produção');
    setSelectedContent(null);
  };

  const handleRequestChanges = (content: Content) => {
    if (!newComment.trim()) {
      toast.error('Adicione um comentário com as alterações solicitadas');
      return;
    }

    const comment: Comment = {
      id: generateId(),
      contentId: content.id,
      userId: 'current-user',
      userName: 'Você',
      message: newComment,
      createdAt: new Date().toISOString(),
      read: true,
    };

    const updatedComments = [comment, ...comments];
    setComments(updatedComments);
    saveToStorage('comments', updatedComments);

    const updatedContents = contents.map(c =>
      c.id === content.id ? { ...c, status: 'production' as const } : c
    );
    setContents(updatedContents);
    saveToStorage('contents', updatedContents);

    setNewComment('');
    toast.success('Alterações solicitadas!');
    setSelectedContent(null);
  };

  const handleAddComment = () => {
    if (!newComment.trim() || !selectedContent) return;

    const comment: Comment = {
      id: generateId(),
      contentId: selectedContent.id,
      userId: 'current-user',
      userName: 'Você',
      message: newComment,
      createdAt: new Date().toISOString(),
      read: true,
    };

    const updatedComments = [comment, ...comments];
    setComments(updatedComments);
    saveToStorage('comments', updatedComments);
    setNewComment('');
    toast.success('Comentário adicionado!');
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
              className="bg-card rounded-xl border border-border overflow-hidden card-hover"
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

                {content.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {content.hashtags.slice(0, 4).map(tag => (
                      <span key={tag} className="text-xs text-primary">#{tag}</span>
                    ))}
                  </div>
                )}

                <p className="text-xs text-muted-foreground mb-4">
                  Criado por: {getEmployeeName(content.responsibleId)}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApprove(content)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-success/10 text-success hover:bg-success/20 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Check className="w-4 h-4" /> Aprovar
                  </button>
                  <button
                    onClick={() => handleReject(content)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-lg text-sm font-medium transition-colors"
                  >
                    <X className="w-4 h-4" /> Reprovar
                  </button>
                  <button
                    onClick={() => setSelectedContent(content)}
                    className="px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comments Modal */}
      <Modal
        isOpen={!!selectedContent}
        onClose={() => { setSelectedContent(null); setNewComment(''); }}
        title="Comentários e Feedback"
        size="lg"
      >
        {selectedContent && (
          <div className="space-y-4">
            {/* Content Summary */}
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-1">{selectedContent.title}</h4>
              <p className="text-sm text-muted-foreground">{getClientName(selectedContent.clientId)}</p>
            </div>

            {/* Add Comment */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Adicionar comentário..."
                className="flex-1 px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
                onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
              />
              <button
                onClick={handleAddComment}
                className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {/* Comments List */}
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {getContentComments(selectedContent.id).map(comment => (
                <div key={comment.id} className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{comment.userName}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(comment.createdAt), "dd/MM 'às' HH:mm")}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{comment.message}</p>
                </div>
              ))}
              {getContentComments(selectedContent.id).length === 0 && (
                <p className="text-center text-muted-foreground py-4 text-sm">
                  Nenhum comentário ainda
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t border-border">
              <button
                onClick={() => handleApprove(selectedContent)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-success text-success-foreground rounded-lg font-medium"
              >
                <Check className="w-4 h-4" /> Aprovar
              </button>
              <button
                onClick={() => handleRequestChanges(selectedContent)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-warning text-warning-foreground rounded-lg font-medium"
              >
                Solicitar Alterações
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
