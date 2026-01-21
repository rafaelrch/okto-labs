import { useState } from 'react';
import { Plus, Edit2, Trash2, Eye, Archive, Instagram, Facebook, Linkedin, Loader2 } from 'lucide-react';
import { useClients, useEmployees, Client } from '@/hooks/useSupabaseData';
import { Modal } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ClientsPageProps {
  searchQuery: string;
}

const defaultColors = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

export function ClientsPage({ searchQuery }: ClientsPageProps) {
  const { data: clients, loading, create, update, remove } = useClients();
  const { data: employees } = useEmployees();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    segment: '',
    instagram: '',
    facebook: '',
    tiktok: '',
    linkedin: '',
    color: '#3B82F6',
    contract_start: '',
    notes: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      segment: '',
      instagram: '',
      facebook: '',
      tiktok: '',
      linkedin: '',
      color: defaultColors[Math.floor(Math.random() * defaultColors.length)],
      contract_start: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setEditingClient(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const socials: Record<string, string> = {};
    if (formData.instagram.trim()) socials.instagram = formData.instagram.trim();
    if (formData.facebook.trim()) socials.facebook = formData.facebook.trim();
    if (formData.tiktok.trim()) socials.tiktok = formData.tiktok.trim();
    if (formData.linkedin.trim()) socials.linkedin = formData.linkedin.trim();

    const clientData = {
      name: formData.name.trim(),
      segment: formData.segment.trim(),
      logo: '',
      socials: socials,
      color: formData.color,
      status: editingClient?.status || 'active' as const,
      contract_start: formData.contract_start || null,
      notes: formData.notes.trim() || '',
    };

    try {
      if (editingClient) {
        await update(editingClient.id, clientData);
        toast.success('Cliente atualizado!');
      } else {
        await create(clientData as any);
        toast.success('Cliente cadastrado!');
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Erro ao salvar cliente: ${errorMessage}`);
    }
  };

  const handleEdit = (client: Client) => {
    setFormData({
      name: client.name,
      segment: client.segment,
      instagram: client.socials?.instagram || '',
      facebook: client.socials?.facebook || '',
      tiktok: client.socials?.tiktok || '',
      linkedin: client.socials?.linkedin || '',
      color: client.color,
      contract_start: client.contract_start || '',
      notes: client.notes,
    });
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const toggleStatus = async (id: string) => {
    const client = clients.find(c => c.id === id);
    if (client) {
      await update(id, { status: client.status === 'active' ? 'inactive' : 'active' });
      toast.success('Status atualizado!');
    }
  };

  const handleDelete = async (id: string) => {
    await remove(id);
    toast.success('Cliente excluído!');
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.segment.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = showArchived ? client.status === 'inactive' : client.status === 'active';
    return matchesSearch && matchesStatus;
  });

  const getResponsibleName = (id?: string) => {
    if (!id) return 'Não atribuído';
    return employees.find(e => e.id === id)?.name || 'Não atribuído';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowArchived(false)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              !showArchived ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            )}
          >
            Ativos ({clients.filter(c => c.status === 'active').length})
          </button>
          <button
            onClick={() => setShowArchived(true)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              showArchived ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            )}
          >
            Arquivados ({clients.filter(c => c.status === 'inactive').length})
          </button>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 btn-primary-gradient rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Novo Cliente
        </button>
      </div>

      {/* Clients Grid */}
      {filteredClients.length === 0 ? (
        <EmptyState
          icon={Archive}
          title={showArchived ? 'Nenhum cliente arquivado' : 'Nenhum cliente cadastrado'}
          description={showArchived ? 'Clientes arquivados aparecerão aqui' : 'Comece adicionando seu primeiro cliente!'}
          action={!showArchived ? {
            label: 'Cadastrar Cliente',
            onClick: () => { resetForm(); setIsModalOpen(true); }
          } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map(client => (
            <div key={client.id} className="bg-card rounded-xl border border-border overflow-hidden card-hover">
              <div 
                className="h-2"
                style={{ backgroundColor: client.color }}
              />
              <div className="p-5">
                <div className="flex items-start gap-4 mb-4">
                  {client.logo ? (
                    <img 
                      src={client.logo} 
                      alt={client.name}
                      className="w-14 h-14 rounded-xl object-cover"
                    />
                  ) : (
                    <div 
                      className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold text-white"
                      style={{ backgroundColor: client.color }}
                    >
                      {getInitials(client.name)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-card-foreground truncate">{client.name}</h3>
                    <p className="text-sm text-muted-foreground">{client.segment}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Resp: {getResponsibleName(client.responsible_id)}
                    </p>
                  </div>
                </div>

                {/* Social Links */}
                <div className="flex items-center gap-2 mb-4">
                  {client.socials?.instagram && (
                    <span className="p-1.5 bg-muted rounded-lg">
                      <Instagram className="w-4 h-4 text-muted-foreground" />
                    </span>
                  )}
                  {client.socials?.facebook && (
                    <span className="p-1.5 bg-muted rounded-lg">
                      <Facebook className="w-4 h-4 text-muted-foreground" />
                    </span>
                  )}
                  {client.socials?.linkedin && (
                    <span className="p-1.5 bg-muted rounded-lg">
                      <Linkedin className="w-4 h-4 text-muted-foreground" />
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <button
                    onClick={() => setViewingClient(client)}
                    className="flex items-center gap-1 text-sm text-primary hover:text-primary/80"
                  >
                    <Eye className="w-4 h-4" /> Ver detalhes
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(client)}
                      className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleStatus(client.id)}
                      className="p-1.5 text-muted-foreground hover:text-warning transition-colors"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(client.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editingClient ? 'Editar Cliente' : 'Novo Cliente'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Nome/Empresa *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Segmento *</label>
              <input
                type="text"
                required
                value={formData.segment}
                onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
                className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Cor Identificadora</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-10 h-10 rounded-lg cursor-pointer"
              />
              <div className="flex gap-1">
                {defaultColors.slice(0, 5).map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className="w-6 h-6 rounded-full border-2 border-transparent hover:border-foreground/20"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Instagram</label>
              <input
                type="text"
                value={formData.instagram}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                placeholder="@usuario"
                className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Facebook</label>
              <input
                type="text"
                value={formData.facebook}
                onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">TikTok</label>
              <input
                type="text"
                value={formData.tiktok}
                onChange={(e) => setFormData({ ...formData, tiktok: e.target.value })}
                className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">LinkedIn</label>
              <input
                type="text"
                value={formData.linkedin}
                onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Data de Início</label>
            <input
              type="date"
              value={formData.contract_start}
              onChange={(e) => setFormData({ ...formData, contract_start: e.target.value })}
              className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Observações</label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary resize-none"
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
              {editingClient ? 'Salvar' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Details Modal */}
      <Modal
        isOpen={!!viewingClient}
        onClose={() => setViewingClient(null)}
        title={viewingClient?.name || ''}
        size="lg"
      >
        {viewingClient && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {viewingClient.logo ? (
                <img 
                  src={viewingClient.logo} 
                  alt={viewingClient.name}
                  className="w-20 h-20 rounded-xl object-cover"
                />
              ) : (
                <div 
                  className="w-20 h-20 rounded-xl flex items-center justify-center text-2xl font-bold text-white"
                  style={{ backgroundColor: viewingClient.color }}
                >
                  {getInitials(viewingClient.name)}
                </div>
              )}
              <div>
                <h3 className="text-xl font-semibold text-foreground">{viewingClient.name}</h3>
                <p className="text-muted-foreground">{viewingClient.segment}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Responsável</p>
                <p className="font-medium">{getResponsibleName(viewingClient.responsible_id)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Início do Contrato</p>
                <p className="font-medium">{viewingClient.contract_start || 'Não informado'}</p>
              </div>
            </div>

            {viewingClient.notes && (
              <div>
                <p className="text-sm text-muted-foreground">Observações</p>
                <p className="font-medium">{viewingClient.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
