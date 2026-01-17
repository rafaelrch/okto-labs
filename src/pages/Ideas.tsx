import { useState } from 'react';
import { Plus, Heart, Edit2, Trash2, Search, Loader2 } from 'lucide-react';
import { useIdeas, Idea } from '@/hooks/useSupabaseData';
import { Modal } from '@/components/ui/modal';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const categories = [
  { value: 'reels', label: 'Reels' },
  { value: 'stories', label: 'Stories' },
  { value: 'feed', label: 'Feed' },
  { value: 'carousel', label: 'Carrossel' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'other', label: 'Outro' },
];

const statuses = [
  { value: 'new', label: 'Nova' },
  { value: 'analyzing', label: 'Em Análise' },
  { value: 'approved', label: 'Aprovada' },
  { value: 'discarded', label: 'Descartada' },
];

interface IdeasPageProps {
  searchQuery: string;
}

export function IdeasPage({ searchQuery }: IdeasPageProps) {
  const { data: ideas, loading, create, update, remove } = useIdeas();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'reels' as Idea['category'],
    tags: '',
    status: 'new' as Idea['status'],
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'reels',
      tags: '',
      status: 'new',
    });
    setEditingIdea(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const ideaData = {
      title: formData.title,
      description: formData.description,
      category: formData.category,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      status: formData.status,
      favorite: editingIdea?.favorite || false,
    };

    try {
      if (editingIdea) {
        await update(editingIdea.id, ideaData);
        toast.success('Ideia atualizada com sucesso!');
      } else {
        await create(ideaData as any);
        toast.success('Ideia criada com sucesso!');
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Erro ao salvar ideia');
    }
  };

  const handleEdit = (idea: Idea) => {
    setFormData({
      title: idea.title,
      description: idea.description,
      category: idea.category,
      tags: idea.tags.join(', '),
      status: idea.status,
    });
    setEditingIdea(idea);
    setIsModalOpen(true);
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
    return matchesSearch && matchesCategory && matchesStatus;
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
      >
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <label className="block text-sm font-medium text-foreground mb-1">Descrição *</label>
            <textarea
              required
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Idea['status'] })}
                className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
              >
                {statuses.map(st => (
                  <option key={st.value} value={st.value}>{st.label}</option>
                ))}
              </select>
            </div>
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
              {editingIdea ? 'Salvar Alterações' : 'Criar Ideia'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
