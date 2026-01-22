import { useState, useRef } from 'react';
import { Plus, Edit2, Trash2, Eye, Archive, Instagram, Facebook, Linkedin, Loader2, Upload, X, AlertTriangle } from 'lucide-react';
import { useClients, useEmployees, Client } from '@/hooks/useSupabaseData';
import { Modal } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { uploadFile, deleteFile } from '@/lib/supabase-storage';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    segment: '',
    instagram: '',
    facebook: '',
    tiktok: '',
    linkedin: '',
    color: '#3B82F6',
    contract_start: '',
    contract_value: '',
    contract_months: '',
    services_sold: [] as string[],
    serviceInput: '',
    notes: '',
    logoFile: null as File | null,
    logoPreview: null as string | null,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      contract_value: '',
      contract_months: '',
      services_sold: [],
      serviceInput: '',
      notes: '',
      logoFile: null,
      logoPreview: null,
    });
    setEditingClient(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const socials: Record<string, string> = {};
    if (formData.instagram.trim()) socials.instagram = formData.instagram.trim();
    if (formData.facebook.trim()) socials.facebook = formData.facebook.trim();
    if (formData.tiktok.trim()) socials.tiktok = formData.tiktok.trim();
    if (formData.linkedin.trim()) socials.linkedin = formData.linkedin.trim();

    let logoUrl = editingClient?.logo_url || '';
    
    // Upload da logo se houver novo arquivo
    if (formData.logoFile) {
      const uploadedUrl = await uploadFile(formData.logoFile, 'clients');
      if (uploadedUrl) {
        logoUrl = uploadedUrl;
        // Deletar logo antiga se existir
        if (editingClient?.logo_url) {
          await deleteFile(editingClient.logo_url);
        }
      } else {
        toast.error('Erro ao fazer upload da logo');
        return;
      }
    }

    const clientData = {
      name: formData.name.trim(),
      segment: formData.segment.trim(),
      logo: logoUrl || '',
      logo_url: logoUrl || null,
      socials: socials,
      color: formData.color,
      status: editingClient?.status || 'active' as const,
      contract_start: formData.contract_start || null,
      contract_value: formData.contract_value ? parseFloat(formData.contract_value) : null,
      contract_months: formData.contract_months ? parseInt(formData.contract_months) : null,
      services_sold: formData.services_sold.length > 0 ? formData.services_sold : null,
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
      contract_value: client.contract_value?.toString() || '',
      contract_months: client.contract_months?.toString() || '',
      services_sold: client.services_sold || [],
      serviceInput: '',
      notes: client.notes,
      logoFile: null,
      logoPreview: client.logo_url || client.logo || null,
    });
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione uma imagem');
        return;
      }
      setFormData({
        ...formData,
        logoFile: file,
        logoPreview: URL.createObjectURL(file),
      });
    }
  };

  const removeLogo = () => {
    setFormData({
      ...formData,
      logoFile: null,
      logoPreview: null,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const addService = () => {
    if (formData.serviceInput.trim()) {
      setFormData({
        ...formData,
        services_sold: [...formData.services_sold, formData.serviceInput.trim()],
        serviceInput: '',
      });
    }
  };

  const removeService = (index: number) => {
    setFormData({
      ...formData,
      services_sold: formData.services_sold.filter((_, i) => i !== index),
    });
  };

  const toggleStatus = async (id: string) => {
    const client = clients.find(c => c.id === id);
    if (client) {
      await update(id, { status: client.status === 'active' ? 'inactive' : 'active' });
      toast.success('Status atualizado!');
    }
  };

  const handleDeleteClick = (client: Client) => {
    setClientToDelete(client);
  };

  const handleDeleteConfirm = async () => {
    if (!clientToDelete) return;
    
    try {
      // Primeiro, remover referências nas tarefas
      const { error: tasksError } = await supabase
        .from('tasks')
        .update({ client_id: null })
        .eq('client_id', clientToDelete.id);

      if (tasksError) {
        console.error('Erro ao atualizar tarefas:', tasksError);
        toast.error('Erro ao remover referências do cliente nas tarefas');
        return;
      }

      // Deletar logo se existir
      if (clientToDelete.logo_url) {
        await deleteFile(clientToDelete.logo_url);
      }

      // Agora pode deletar o cliente
      await remove(clientToDelete.id);
      toast.success('Cliente excluído!');
      setClientToDelete(null);
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      toast.error('Erro ao excluir cliente');
    }
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
                  {(client.logo_url || client.logo) ? (
                    <img 
                      src={client.logo_url || client.logo} 
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
                    <h3 className="text-xl font-semibold text-card-foreground truncate mb-1">{client.name}</h3>
                    <p className="text-sm font-medium text-muted-foreground">{client.segment}</p>
                  </div>
                </div>

                {/* Services Sold */}
                {client.services_sold && client.services_sold.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-2">Serviços vendidos</p>
                    <div className="flex flex-wrap gap-1.5">
                      {client.services_sold.slice(0, 3).map((service, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-0.5 bg-primary/10 text-primary rounded-md text-xs font-medium"
                        >
                          {service}
                        </span>
                      ))}
                      {client.services_sold.length > 3 && (
                        <span className="inline-flex items-center px-2 py-0.5 bg-muted text-muted-foreground rounded-md text-xs font-medium">
                          +{client.services_sold.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Social Links */}
                <div className="flex items-center gap-2 mb-4">
                  {client.socials?.instagram && (
                    <a
                      href={client.socials.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                      title={client.socials.instagram}
                    >
                      <Instagram className="w-4 h-4 text-muted-foreground" />
                    </a>
                  )}
                  {client.socials?.facebook && (
                    <a
                      href={client.socials.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                      title={client.socials.facebook}
                    >
                      <Facebook className="w-4 h-4 text-muted-foreground" />
                    </a>
                  )}
                  {client.socials?.tiktok && (
                    <a
                      href={client.socials.tiktok}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                      title={client.socials.tiktok}
                    >
                      <span className="text-xs font-semibold">TT</span>
                    </a>
                  )}
                  {client.socials?.linkedin && (
                    <a
                      href={client.socials.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                      title={client.socials.linkedin}
                    >
                      <Linkedin className="w-4 h-4 text-muted-foreground" />
                    </a>
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
                      onClick={() => handleDeleteClick(client)}
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
            <label className="block text-sm font-medium text-foreground mb-1">Logo do Cliente</label>
            <div className="flex items-center gap-4">
              {formData.logoPreview && (
                <div className="relative">
                  <img
                    src={formData.logoPreview}
                    alt="Preview"
                    className="w-20 h-20 rounded-lg object-cover border border-border"
                  />
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                  id="logo-upload"
                />
                <label
                  htmlFor="logo-upload"
                  className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">{formData.logoPreview ? 'Alterar Logo' : 'Upload de Logo'}</span>
                </label>
              </div>
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
                type="url"
                value={formData.instagram}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                placeholder="https://instagram.com/usuario"
                className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Facebook</label>
              <input
                type="url"
                value={formData.facebook}
                onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                placeholder="https://facebook.com/usuario"
                className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">TikTok</label>
              <input
                type="url"
                value={formData.tiktok}
                onChange={(e) => setFormData({ ...formData, tiktok: e.target.value })}
                placeholder="https://tiktok.com/@usuario"
                className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">LinkedIn</label>
              <input
                type="url"
                value={formData.linkedin}
                onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                placeholder="https://linkedin.com/in/usuario"
                className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <label className="block text-sm font-medium text-foreground mb-1">Valor de Contrato (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.contract_value}
                onChange={(e) => setFormData({ ...formData, contract_value: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Meses de Contrato</label>
              <input
                type="number"
                min="1"
                value={formData.contract_months}
                onChange={(e) => setFormData({ ...formData, contract_months: e.target.value })}
                placeholder="12"
                className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Serviços Vendidos</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={formData.serviceInput}
                onChange={(e) => setFormData({ ...formData, serviceInput: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addService();
                  }
                }}
                placeholder="Digite um serviço e pressione Enter"
                className="flex-1 px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={addService}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Adicionar
              </button>
            </div>
            {formData.services_sold.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.services_sold.map((service, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                  >
                    {service}
                    <button
                      type="button"
                      onClick={() => removeService(index)}
                      className="hover:text-primary/80"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
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
              {(viewingClient.logo_url || viewingClient.logo) ? (
                <img 
                  src={viewingClient.logo_url || viewingClient.logo} 
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
              <div>
                <p className="text-sm text-muted-foreground">Valor do Contrato</p>
                <p className="font-medium">
                  {viewingClient.contract_value 
                    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(viewingClient.contract_value)
                    : 'Não informado'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Meses de Contrato</p>
                <p className="font-medium">{viewingClient.contract_months ? `${viewingClient.contract_months} meses` : 'Não informado'}</p>
              </div>
            </div>

            {viewingClient.services_sold && viewingClient.services_sold.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Serviços Vendidos</p>
                <div className="flex flex-wrap gap-2">
                  {viewingClient.services_sold.map((service, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                    >
                      {service}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(viewingClient.socials?.instagram || viewingClient.socials?.facebook || viewingClient.socials?.tiktok || viewingClient.socials?.linkedin) && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Redes Sociais</p>
                <div className="flex items-center gap-2">
                  {viewingClient.socials?.instagram && (
                    <a
                      href={viewingClient.socials.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                    >
                      <Instagram className="w-4 h-4" />
                      <span className="text-sm">Instagram</span>
                    </a>
                  )}
                  {viewingClient.socials?.facebook && (
                    <a
                      href={viewingClient.socials.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                    >
                      <Facebook className="w-4 h-4" />
                      <span className="text-sm">Facebook</span>
                    </a>
                  )}
                  {viewingClient.socials?.tiktok && (
                    <a
                      href={viewingClient.socials.tiktok}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                    >
                      <span className="text-sm font-semibold">TikTok</span>
                    </a>
                  )}
                  {viewingClient.socials?.linkedin && (
                    <a
                      href={viewingClient.socials.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                    >
                      <Linkedin className="w-4 h-4" />
                      <span className="text-sm">LinkedIn</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {viewingClient.notes && (
              <div>
                <p className="text-sm text-muted-foreground">Observações</p>
                <p className="font-medium">{viewingClient.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!clientToDelete} onOpenChange={(open) => !open && setClientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-destructive/10 rounded-full">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-2">
              Tem certeza que deseja excluir o cliente <strong>"{clientToDelete?.name}"</strong>?
              <br />
              <span className="text-destructive font-medium">Esta ação não pode ser desfeita.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setClientToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Cliente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
