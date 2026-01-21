import { useState, useRef } from 'react';
import { Plus, Heart, Edit2, Trash2, Search, Loader2, Upload, Link as LinkIcon, X } from 'lucide-react';
import { useIdeas, useClients, Idea } from '@/hooks/useSupabaseData';
import { useAuth } from '@/hooks/useAuth';
import { Modal } from '@/components/ui/modal';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { uploadFile } from '@/lib/supabase-storage';

const categories = [
  { value: 'reels', label: 'Reels' },
  { value: 'stories', label: 'Stories' },
  { value: 'feed', label: 'Feed' },
  { value: 'carousel', label: 'Carrossel' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'other', label: 'Outro' },
];

const statuses = [
  { value: 'new', label: 'Nova', color: 'bg-blue-500/20 text-blue-600 border-blue-500/20' },
  { value: 'analyzing', label: 'Em Análise', color: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/20' },
  { value: 'approved', label: 'Aprovada', color: 'bg-green-500/20 text-green-600 border-green-500/20' },
  { value: 'discarded', label: 'Descartada', color: 'bg-red-500/20 text-red-600 border-red-500/20' },
];

interface IdeasPageProps {
  searchQuery: string;
}

export function IdeasPage({ searchQuery }: IdeasPageProps) {
  const { data: ideas, loading, create, update, remove } = useIdeas();
  const { data: clients } = useClients();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterFavorites, setFilterFavorites] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'reels' as Idea['category'],
    tags: '',
    status: 'new' as Idea['status'],
    client_id: '',
    reference_type: 'link' as 'link' | 'upload',
    reference_link: '',
    reference_files: [] as string[],
  });
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'reels',
      tags: '',
      status: 'new',
      client_id: '',
      reference_type: 'link',
      reference_link: '',
      reference_files: [],
    });
    setUploadedFiles([]);
    setFilePreviews([]);
    setEditingIdea(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id && !editingIdea) {
      toast.error('Você precisa estar logado para criar ideias');
      return;
    }

    // Preparar referências de links
    const referenceLinks = formData.reference_type === 'link' && formData.reference_link
      ? formData.reference_link.split(',').map(link => link.trim()).filter(Boolean)
      : [];

    // Preparar referências de arquivos
    let referenceFiles: string[] = [];
    
    if (formData.reference_type === 'upload') {
      // Se houver arquivos já enviados (com URLs), usar eles
      if (formData.reference_files.length > 0) {
        referenceFiles = formData.reference_files;
      }
      // Se houver arquivos novos não enviados ainda, fazer upload agora
      else if (uploadedFiles.length > 0) {
        try {
          toast.loading('Enviando arquivos...', { id: 'upload-submit' });
          const folder = editingIdea ? `ideas/${editingIdea.id}` : 'ideas/temp';
          const uploadPromises = uploadedFiles.map(async (file) => {
            const url = await uploadFile(file, folder);
            return url;
          });

          const uploadedUrls = await Promise.all(uploadPromises);
          referenceFiles = uploadedUrls.filter((url): url is string => url !== null);
          toast.dismiss('upload-submit');
          
          if (referenceFiles.length === 0) {
            toast.error('Nenhum arquivo foi enviado com sucesso');
            return;
          }
          
          // Atualizar formData com as URLs dos arquivos enviados
          setFormData(prev => ({
            ...prev,
            reference_files: referenceFiles,
          }));
        } catch (error) {
          console.error('Erro ao fazer upload:', error);
          toast.dismiss('upload-submit');
          toast.error('Erro ao fazer upload dos arquivos');
          return;
        }
      }
    }

    // Preparar dados para salvar no banco
    // Garantir que arrays vazios sejam salvos como arrays vazios, não null
    const ideaData: any = {
      ...(editingIdea ? {} : { user_id: user?.id }),
      title: formData.title,
      description: formData.description,
      category: formData.category,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      status: formData.status,
      favorite: editingIdea?.favorite || false,
      client_id: formData.client_id || null,
      reference_links: referenceLinks.length > 0 ? referenceLinks : [],
      reference_files: referenceFiles.length > 0 ? referenceFiles : [],
    };

    console.log('Dados a serem salvos:', ideaData);
    console.log('Reference links:', referenceLinks);
    console.log('Reference files:', referenceFiles);

    try {
      if (editingIdea) {
        await update(editingIdea.id, ideaData);
        toast.success('Ideia atualizada com sucesso!');
      } else {
        const newIdea = await create(ideaData);
        console.log('Ideia criada:', newIdea);
        
        // Os arquivos já estão no storage e as URLs já foram salvas no banco
        // Se necessário, podemos mover os arquivos de 'ideas/temp' para 'ideas/{idea_id}' depois
        // Mas por enquanto, os arquivos funcionarão normalmente onde estão
        
        toast.success('Ideia criada com sucesso!');
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar ideia:', error);
      toast.error('Erro ao salvar ideia. Verifique o console para mais detalhes.');
    }
  };

  const handleEdit = (idea: Idea) => {
    // Determinar o tipo de referência baseado no que existe
    const hasLinks = idea.reference_links && idea.reference_links.length > 0;
    const hasFiles = idea.reference_files && idea.reference_files.length > 0;
    const referenceType = hasFiles ? 'upload' : hasLinks ? 'link' : 'link';

    setFormData({
      title: idea.title,
      description: idea.description,
      category: idea.category,
      tags: idea.tags.join(', '),
      status: idea.status,
      client_id: idea.client_id || '',
      reference_type: referenceType,
      reference_link: idea.reference_links?.join(', ') || '',
      reference_files: idea.reference_files || [],
    });
    
    // Se houver arquivos, criar previews
    if (idea.reference_files && idea.reference_files.length > 0) {
      setFilePreviews(idea.reference_files);
    } else {
      setFilePreviews([]);
    }
    
    setUploadedFiles([]);
    setEditingIdea(idea);
    setIsModalOpen(true);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    // Criar previews temporários
    const tempPreviews = selectedFiles.map(file => URL.createObjectURL(file));
    setFilePreviews(prev => [...prev, ...tempPreviews]);
    setUploadedFiles(prev => [...prev, ...selectedFiles]);

    // Fazer upload dos arquivos imediatamente para o storage
    try {
      toast.loading('Enviando arquivos...', { id: 'upload-files' });
      
      const uploadPromises = selectedFiles.map(async (file) => {
        // Se estiver editando, usar o ID da ideia, senão usar 'temp' temporariamente
        const folder = editingIdea ? `ideas/${editingIdea.id}` : 'ideas/temp';
        const url = await uploadFile(file, folder);
        return url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const successfulUrls = uploadedUrls.filter((url): url is string => url !== null);

      toast.dismiss('upload-files');

      if (successfulUrls.length > 0) {
        // Adicionar as URLs aos arquivos de referência
        setFormData(prev => ({
          ...prev,
          reference_files: [...prev.reference_files, ...successfulUrls],
        }));
        toast.success(`${successfulUrls.length} arquivo(s) enviado(s) com sucesso!`);
      }

      if (successfulUrls.length < selectedFiles.length) {
        toast.error(`${selectedFiles.length - successfulUrls.length} arquivo(s) falharam no upload`);
      }
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.dismiss('upload-files');
      toast.error('Erro ao fazer upload dos arquivos');
    }
    
    // Limpar o input para permitir selecionar o mesmo arquivo novamente
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    // Se o preview for um blob URL (arquivo novo), revogar a URL
    setFilePreviews(prev => {
      const newPreviews = [...prev];
      if (newPreviews[index]?.startsWith('blob:')) {
        URL.revokeObjectURL(newPreviews[index]);
      }
      newPreviews.splice(index, 1);
      return newPreviews;
    });
    
    // Remover do array de arquivos novos (se existir)
    if (index < uploadedFiles.length) {
      setUploadedFiles(prev => {
        const newFiles = [...prev];
        newFiles.splice(index, 1);
        return newFiles;
      });
    }
    
    // Remover da lista de arquivos de referência
    setFormData(prev => ({
      ...prev,
      reference_files: prev.reference_files.filter((_, i) => i !== index),
    }));
  };

  const handleDelete = async (id: string) => {
    await remove(id);
    toast.success('Ideia excluída!');
  };

  const toggleFavorite = async (id: string) => {
    const idea = ideas.find(i => i.id === id);
    if (idea) {
      await update(id, { favorite: !idea.favorite });
    }
  };

  const filteredIdeas = ideas.filter(idea => {
    const matchesSearch = 
      idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      idea.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      idea.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = !filterCategory || idea.category === filterCategory;
    const matchesStatus = !filterStatus || idea.status === filterStatus;
    const matchesFavorites = !filterFavorites || idea.favorite === true;
    return matchesSearch && matchesCategory && matchesStatus && matchesFavorites;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 bg-muted rounded-lg text-sm border-0 outline-none"
          >
            <option value="">Todas categorias</option>
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-muted rounded-lg text-sm border-0 outline-none"
          >
            <option value="">Todos status</option>
            {statuses.map(st => (
              <option key={st.value} value={st.value}>{st.label}</option>
            ))}
          </select>
          <button
            onClick={() => setFilterFavorites(!filterFavorites)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              filterFavorites
                ? 'bg-warning/20 text-warning border border-warning/30'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            <Heart className={cn('w-4 h-4', filterFavorites && 'fill-current')} />
            Favoritas
          </button>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 btn-primary-gradient rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Nova Ideia
        </button>
      </div>

      {/* Ideas Grid */}
      {filteredIdeas.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nenhuma ideia encontrada"
          description="Comece adicionando ideias para inspirar sua equipe!"
          action={{
            label: 'Criar Ideia',
            onClick: () => { resetForm(); setIsModalOpen(true); }
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredIdeas.map(idea => (
            <div key={idea.id} className="bg-card rounded-xl border border-border p-5 card-hover">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-card-foreground mb-1">{idea.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{idea.description}</p>
                </div>
                <button
                  onClick={() => toggleFavorite(idea.id)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    idea.favorite ? 'text-warning' : 'text-muted-foreground hover:text-warning'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${idea.favorite ? 'fill-current' : ''}`} />
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md font-medium">
                  {categories.find(c => c.value === idea.category)?.label}
                </span>
                <StatusBadge status={idea.status} type="idea" />
                {idea.client_id && (
                  <span className="px-2 py-1 bg-accent/10 text-accent text-xs rounded-md font-medium">
                    {clients.find(c => c.id === idea.client_id)?.name || 'Cliente'}
                  </span>
                )}
              </div>

              {idea.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {idea.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  {format(new Date(idea.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(idea)}
                    className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(idea.id)}
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
        title={editingIdea ? 'Editar Ideia' : 'Nova Ideia'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            {/* Coluna Esquerda */}
            <div className="space-y-4">
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
                <label className="block text-sm font-medium text-foreground mb-1">Cliente</label>
                <select
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                  className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Selecione um cliente (opcional)</option>
                  {clients.filter(c => c.status === 'active').map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Categoria</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as Idea['category'] })}
                  className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Status</label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as Idea['status'] })}
                >
                  <SelectTrigger className={cn(
                    "w-full border-0 focus:ring-2 focus:ring-primary",
                    statuses.find(s => s.value === formData.status)?.color || "bg-muted"
                  )}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map(st => (
                      <SelectItem
                        key={st.value}
                        value={st.value}
                        className={cn("cursor-pointer my-1.5", st.color)}
                      >
                        {st.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Tags (separadas por vírgula)</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="café, receita, reels"
                  className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Coluna Direita */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Descrição *</label>
                <textarea
                  required
                  rows={8}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Referência</label>
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, reference_type: 'link' })}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors',
                      formData.reference_type === 'link'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                  >
                    <LinkIcon className="w-4 h-4" />
                    Link
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, reference_type: 'upload' })}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors',
                      formData.reference_type === 'upload'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                  >
                    <Upload className="w-4 h-4" />
                    Arquivos
                  </button>
                </div>

                {formData.reference_type === 'link' ? (
                  <input
                    type="url"
                    value={formData.reference_link}
                    onChange={(e) => setFormData({ ...formData, reference_link: e.target.value })}
                    placeholder="https://... (separar múltiplos links por vírgula)"
                    className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
                  />
                ) : (
                  <div className="space-y-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,video/*,.pdf,.doc,.docx"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-muted hover:bg-muted/80 rounded-lg border-2 border-dashed border-border transition-colors"
                    >
                      <Upload className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Clique para adicionar arquivos</span>
                    </button>

                    {/* Preview dos arquivos */}
                    {(filePreviews.length > 0 || formData.reference_files.length > 0) && (
                      <div className="space-y-2">
                        {filePreviews.map((preview, index) => {
                          const file = uploadedFiles[index];
                          // Verificar se é uma imagem: pelo tipo do arquivo ou pela URL
                          const isImage = file?.type.startsWith('image/') || preview.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                          return (
                            <div key={index} className="relative group">
                              {isImage ? (
                                <img
                                  src={preview}
                                  alt={`Preview ${index + 1}`}
                                  className="w-full h-32 object-cover rounded-lg"
                                />
                              ) : (
                                <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center">
                                  <span className="text-sm text-muted-foreground">{file?.name || `Arquivo ${index + 1}`}</span>
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => removeFile(index)}
                                className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                        {formData.reference_files.filter((_, i) => i >= filePreviews.length).map((url, index) => {
                          const actualIndex = index + filePreviews.length;
                          const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                          return (
                            <div key={actualIndex} className="relative group">
                              {isImage ? (
                                <img
                                  src={url}
                                  alt={`Uploaded ${actualIndex + 1}`}
                                  className="w-full h-32 object-cover rounded-lg"
                                />
                              ) : (
                                <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center">
                                  <span className="text-sm text-muted-foreground">Arquivo enviado</span>
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => removeFile(actualIndex)}
                                className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
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
              {editingIdea ? 'Salvar Alterações' : 'Criar Ideia'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
