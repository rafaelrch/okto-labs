import { ReactNode, useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getFromStorage, Content, Task } from '@/lib/storage';
import { useMissions } from '@/hooks/useSupabaseData';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function Layout({ children, currentPage, onPageChange, searchQuery, onSearchChange }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [todayTasks, setTodayTasks] = useState(0);
  const { data: missions } = useMissions();

  useEffect(() => {
    const contents = getFromStorage<Content>('contents');
    setPendingApprovals(contents.filter(c => c.status === 'pending').length);

    const tasks = getFromStorage<Task>('tasks');
    const today = new Date().toISOString().split('T')[0];
    setTodayTasks(tasks.filter(t => t.dueDate === today && t.status !== 'completed').length);
  }, [currentPage]);

  // Calcular missões disponíveis
  const availableMissions = missions.filter(m => m.status === 'available').length;

  const pageNames: Record<string, string> = {
    dashboard: 'Dashboard',
    ideas: 'Banco de Ideias',
    clients: 'Clientes',
    schedule: 'Cronograma',
    approvals: 'Aprovações',
    calendar: 'Calendário',
    tasks: 'Tarefas',
    employees: 'Funcionários',
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - desktop */}
      <div className="hidden lg:block">
        <Sidebar
          currentPage={currentPage}
          onPageChange={onPageChange}
          pendingApprovals={pendingApprovals}
          todayTasks={todayTasks}
          availableMissions={availableMissions}
        />
      </div>

      {/* Sidebar - mobile */}
      <div
        className={cn(
          'lg:hidden fixed inset-y-0 left-0 z-40 transition-transform duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <Sidebar
          currentPage={currentPage}
          onPageChange={(page) => {
            onPageChange(page);
            setSidebarOpen(false);
          }}
          pendingApprovals={pendingApprovals}
          todayTasks={todayTasks}
          availableMissions={availableMissions}
        />
      </div>

      {/* Main content */}
      <div className="lg:ml-64 min-h-screen overflow-x-hidden">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-between px-4 lg:px-6 h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-muted lg:hidden"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <h1 className="text-xl font-semibold text-foreground">{pageNames[currentPage]}</h1>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6 animate-fade-in max-w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
