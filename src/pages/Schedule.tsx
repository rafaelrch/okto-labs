import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Copy, Filter } from 'lucide-react';
import { getFromStorage, saveToStorage, Content, Client, Employee, generateId } from '@/lib/storage';
import { Modal } from '@/components/ui/modal';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';
import { format } from 'date-fns';
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

export function SchedulePage({ searchQuery }: SchedulePageProps) {
  const [contents, setContents] = useState<Content[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<Content | null>(null);
  const [filterClient, setFilterClient] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
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

  const resetForm = () => {
    const activeClients = clients.filter(c => c.status === 'active');
    const activeEmployees = employees.filter(e => e.status === 'active');
    setFormData({
      clientId: activeClients[0]?.id || '',
      type: 'post',
      title: '',
      description: '',
      publishDate: new Date().toISOString().split('T')[0],
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

  const filteredContents = contents.filter(content => {
    const matchesSearch = 
      content.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      content.copy.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClient = !filterClient || content.clientId === filterClient;
    const matchesStatus = !filterStatus || content.status === filterStatus;
    return matchesSearch && matchesClient && matchesStatus;
  }).sort((a, b) => new Date(a.publishDate).getTime() - new Date(b.publishDate).getTime());

  const getClientName = (id: string) => clients.find(c => c.id === id)?.name || 'Cliente não encontrado';
  const getClientColor = (id: string) => clients.find(c => c.id === id)?.color || '#3B82F6';
  const getEmployeeName = (id: string) => employees.find(e => e.id === id)?.name || 'Não atribuído';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
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
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 btn-primary-gradient rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Novo Conteúdo
        </button>
      </div>

      {/* Contents List */}
      {filteredContents.length === 0 ? (
        <EmptyState
          icon={Filter}
          title="Nenhum conteúdo encontrado"
          description="Crie seu primeiro conteúdo para começar!"
          action={{
            label: 'Criar Conteúdo',
            onClick: () => { resetForm(); setIsModalOpen(true); }
          }}
        />
      ) : (
        <div className="space-y-3">
          {filteredContents.map(content => (
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
                    <span>📅 {format(new Date(content.publishDate), "dd 'de' MMM", { locale: ptBR })} às {content.publishTime}</span>
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
              {editingContent ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
