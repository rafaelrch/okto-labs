import { useState } from 'react';
import { Plus, Edit2, Trash2, Eye, Archive, Mail, Phone, Loader2 } from 'lucide-react';
import { useEmployees, useClients, useTasks, useContents, Employee } from '@/hooks/useSupabaseData';
import { useAuth } from '@/hooks/useAuth';
import { Modal } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EmployeesPageProps {
  searchQuery: string;
}

const roles = [
  'Social Media Manager',
  'Designer',
  'Editor de Vídeo',
  'Redator',
  'Gestor de Tráfego',
  'Analista de Dados',
  'Atendimento',
  'Diretor de Arte',
];

export function EmployeesPage({ searchQuery }: EmployeesPageProps) {
  const { user } = useAuth();
  const { data: employees, loading, create, update, remove } = useEmployees();
  const { data: clients } = useClients();
  const { data: tasks } = useTasks();
  const { data: contents } = useContents();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    role: roles[0],
    email: '',
    phone: '',
    avatar: '',
    hire_date: '',
    skills: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      role: roles[0],
      email: '',
      phone: '',
      avatar: '',
      hire_date: new Date().toISOString().split('T')[0],
      skills: '',
    });
    setEditingEmployee(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      toast.error('Você precisa estar logado para cadastrar funcionários');
      return;
    }

    const employeeData = {
      user_id: user.id,
      name: formData.name.trim(),
      role: formData.role,
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      avatar: formData.avatar.trim(),
      hire_date: formData.hire_date || null,
      status: editingEmployee?.status ?? 'active',
      skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
    };

    try {
      if (editingEmployee) {
        await update(editingEmployee.id, employeeData);
        toast.success('Funcionário atualizado!');
      } else {
        await create(employeeData as any);
        toast.success('Funcionário cadastrado!');
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar funcionário:', error);
      toast.error((error as any)?.message || 'Erro ao salvar funcionário');
    }
  };

  const handleEdit = (employee: Employee) => {
    setFormData({
      name: employee.name,
      role: employee.role,
      email: employee.email,
      phone: employee.phone,
      avatar: employee.avatar,
      hire_date: employee.hire_date || '',
      skills: employee.skills.join(', '),
    });
    setEditingEmployee(employee);
    setIsModalOpen(true);
  };

  const toggleStatus = async (id: string) => {
    const employee = employees.find(e => e.id === id);
    if (employee) {
      await update(id, { status: employee.status === 'active' ? 'inactive' : 'active' });
      toast.success('Status atualizado!');
    }
  };

  const handleDelete = async (id: string) => {
    await remove(id);
    toast.success('Funcionário excluído!');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getEmployeeStats = (employeeId: string) => {
    const assignedClients = clients.filter(c => c.responsible_id === employeeId);
    const assignedTasks = tasks.filter(t => t.responsible_id === employeeId);
    const pendingTasks = assignedTasks.filter(t => t.status !== 'completed');
    const completedTasks = assignedTasks.filter(t => t.status === 'completed');
    const createdContents = contents.filter(c => c.responsible_id === employeeId);

    return {
      clients: assignedClients.length,
      pendingTasks: pendingTasks.length,
      completedTasks: completedTasks.length,
      contents: createdContents.length,
    };
  };

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = 
      employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = showArchived ? employee.status === 'inactive' : employee.status === 'active';
    return matchesSearch && matchesStatus;
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowArchived(false)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              !showArchived ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            )}
          >
            Ativos ({employees.filter(e => e.status === 'active').length})
          </button>
          <button
            onClick={() => setShowArchived(true)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              showArchived ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            )}
          >
            Inativos ({employees.filter(e => e.status === 'inactive').length})
          </button>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 btn-primary-gradient rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Novo Funcionário
        </button>
      </div>

      {/* Employees Grid */}
      {filteredEmployees.length === 0 ? (
        <EmptyState
          icon={Archive}
          title={showArchived ? 'Nenhum funcionário inativo' : 'Nenhum funcionário cadastrado'}
          description={showArchived ? 'Funcionários inativos aparecerão aqui' : 'Comece cadastrando sua equipe!'}
          action={!showArchived ? {
            label: 'Cadastrar Funcionário',
            onClick: () => { resetForm(); setIsModalOpen(true); }
          } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map(employee => {
            const stats = getEmployeeStats(employee.id);
            return (
              <div key={employee.id} className="bg-card rounded-xl border border-border overflow-hidden card-hover">
                <div className="p-5">
                  <div className="flex items-start gap-4 mb-4">
                    {employee.avatar ? (
                      <img 
                        src={employee.avatar} 
                        alt={employee.name}
                        className="w-16 h-16 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xl font-bold">
                        {getInitials(employee.name)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-card-foreground truncate">{employee.name}</h3>
                      <p className="text-sm text-primary">{employee.role}</p>
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="space-y-2 mb-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{employee.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{employee.phone}</span>
                    </div>
                  </div>

                  {/* Skills */}
                  {employee.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {employee.skills.slice(0, 3).map(skill => (
                        <span key={skill} className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full">
                          {skill}
                        </span>
                      ))}
                      {employee.skills.length > 3 && (
                        <span className="text-xs text-muted-foreground">+{employee.skills.length - 3}</span>
                      )}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-2 py-3 border-t border-border">
                    <div className="text-center">
                      <p className="text-lg font-semibold text-card-foreground">{stats.clients}</p>
                      <p className="text-xs text-muted-foreground">Clientes</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-warning">{stats.pendingTasks}</p>
                      <p className="text-xs text-muted-foreground">Pendentes</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-success">{stats.completedTasks}</p>
                      <p className="text-xs text-muted-foreground">Concluídas</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-primary">{stats.contents}</p>
                      <p className="text-xs text-muted-foreground">Conteúdos</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <button
                      onClick={() => setViewingEmployee(employee)}
                      className="flex items-center gap-1 text-sm text-primary hover:text-primary/80"
                    >
                      <Eye className="w-4 h-4" /> Ver perfil
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(employee)}
                        className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleStatus(employee.id)}
                        className="p-1.5 text-muted-foreground hover:text-warning transition-colors"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(employee.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editingEmployee ? 'Editar Funcionário' : 'Novo Funcionário'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Nome Completo *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Cargo/Função *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
              >
                {roles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Email *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Telefone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(11) 99999-9999"
                className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">URL do Avatar</label>
              <input
                type="url"
                value={formData.avatar}
                onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Data de Admissão</label>
              <input
                type="date"
                value={formData.hire_date}
                onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                className="w-full px-3 py-2 bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Habilidades (separadas por vírgula)</label>
            <input
              type="text"
              value={formData.skills}
              onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
              placeholder="Photoshop, Illustrator, Figma"
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
              {editingEmployee ? 'Salvar' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Profile Modal */}
      <Modal
        isOpen={!!viewingEmployee}
        onClose={() => setViewingEmployee(null)}
        title="Perfil do Funcionário"
        size="lg"
      >
        {viewingEmployee && (() => {
          const stats = getEmployeeStats(viewingEmployee.id);
          const assignedClients = clients.filter(c => c.responsible_id === viewingEmployee.id);
          const recentTasks = tasks.filter(t => t.responsible_id === viewingEmployee.id).slice(0, 5);

          return (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center gap-4">
                {viewingEmployee.avatar ? (
                  <img 
                    src={viewingEmployee.avatar} 
                    alt={viewingEmployee.name}
                    className="w-20 h-20 rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold">
                    {getInitials(viewingEmployee.name)}
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-semibold text-foreground">{viewingEmployee.name}</h3>
                  <p className="text-primary">{viewingEmployee.role}</p>
                  {viewingEmployee.hire_date && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Desde {format(new Date(viewingEmployee.hire_date), "MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-muted rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{stats.clients}</p>
                  <p className="text-sm text-muted-foreground">Clientes</p>
                </div>
                <div className="bg-muted rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-warning">{stats.pendingTasks}</p>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                </div>
                <div className="bg-muted rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-success">{stats.completedTasks}</p>
                  <p className="text-sm text-muted-foreground">Concluídas</p>
                </div>
                <div className="bg-muted rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{stats.contents}</p>
                  <p className="text-sm text-muted-foreground">Conteúdos</p>
                </div>
              </div>

              {/* Contact */}
              <div>
                <h4 className="font-semibold text-foreground mb-2">Contato</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span>{viewingEmployee.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{viewingEmployee.phone}</span>
                  </div>
                </div>
              </div>

              {/* Skills */}
              {viewingEmployee.skills.length > 0 && (
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Habilidades</h4>
                  <div className="flex flex-wrap gap-2">
                    {viewingEmployee.skills.map(skill => (
                      <span key={skill} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Assigned Clients */}
              {assignedClients.length > 0 && (
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Clientes Atribuídos</h4>
                  <div className="flex flex-wrap gap-2">
                    {assignedClients.map(client => (
                      <span
                        key={client.id}
                        className="px-3 py-1 rounded-full text-sm text-white"
                        style={{ backgroundColor: client.color }}
                      >
                        {client.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
