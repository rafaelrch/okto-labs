import { useState } from 'react';
import { 
  EnvelopeIcon, 
  PhoneIcon, 
  PencilSquareIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { ArrowPathIcon } from '@heroicons/react/24/solid';
import { useEmployees, Employee } from '@/hooks/useSupabaseData';
import { useAuth } from '@/hooks/useAuth';
import { Modal } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface EmployeesPageProps {
  searchQuery: string;
}

const roles = [
  'Social Media',
  'Editor de Vídeo',
  'Designer',
  'Coordenador(a)',
  'Logística',
  'RH',
  'Filmmaker',
  'Diretoria',
];

export function EmployeesPage({ searchQuery }: EmployeesPageProps) {
  const { user } = useAuth();
  const { data: employees, loading, update } = useEmployees();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    phone: '',
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Encontrar o funcionário do usuário atual
  const currentUserEmployee = employees.find(e => e.user_id === user?.id);

  const handleEditProfile = () => {
    if (currentUserEmployee) {
      setFormData({
        name: currentUserEmployee.name,
        role: currentUserEmployee.role,
        phone: currentUserEmployee.phone || '',
      });
      setEditingEmployee(currentUserEmployee);
      setIsEditModalOpen(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingEmployee) return;

    try {
      await update(editingEmployee.id, {
        name: formData.name.trim(),
        role: formData.role,
        phone: formData.phone.trim(),
      });
      toast.success('Perfil atualizado!');
      setIsEditModalOpen(false);
      setEditingEmployee(null);
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast.error('Erro ao atualizar perfil');
    }
  };

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = 
      employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch && employee.status === 'active';
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <ArrowPathIcon className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground">
            {employees.filter(e => e.status === 'active').length} funcionários ativos
          </p>
        </div>
        {currentUserEmployee && (
          <button
            onClick={handleEditProfile}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <PencilSquareIcon className="w-4 h-4" /> Editar Meu Perfil
          </button>
        )}
      </div>

      {/* Employees Grid */}
      {filteredEmployees.length === 0 ? (
        <EmptyState
          icon={UserCircleIcon}
          title="Nenhum funcionário encontrado"
          description="Não há funcionários cadastrados ou correspondentes à busca."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredEmployees.map(employee => {
            const isCurrentUser = employee.user_id === user?.id;
            
            return (
              <div 
                key={employee.id} 
                className={cn(
                  "bg-card rounded-xl border border-border overflow-hidden transition-all hover:shadow-md",
                  isCurrentUser && "ring-2 ring-primary/50"
                )}
              >
                <div className="p-5">
                  {/* Avatar e Info Principal */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-bold flex-shrink-0">
                      {getInitials(employee.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-card-foreground truncate">
                          {employee.name}
                        </h3>
                        {isCurrentUser && (
                          <span className="px-2 py-0.5 text-[10px] font-medium bg-primary/20 text-primary rounded-full">
                            Você
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-primary truncate">{employee.role}</p>
                    </div>
                  </div>

                  {/* Contato */}
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <EnvelopeIcon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{employee.email}</span>
                    </div>
                    {employee.phone && (
                      <div className="flex items-center gap-2">
                        <PhoneIcon className="w-4 h-4 flex-shrink-0" />
                        <span>{employee.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setEditingEmployee(null); }}
        title="Editar Meu Perfil"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <label className="block text-sm font-medium text-foreground mb-1">Função *</label>
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

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => { setIsEditModalOpen(false); setEditingEmployee(null); }}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Salvar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
