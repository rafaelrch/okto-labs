import { useState } from 'react';
import {
  LayoutDashboard,
  Lightbulb,
  Users,
  Calendar,
  CalendarDays,
  CheckSquare,
  ClipboardCheck,
  UserCircle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  pendingApprovals: number;
  todayTasks: number;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'ideas', label: 'Ideias', icon: Lightbulb },
  { id: 'clients', label: 'Clientes', icon: Users },
  { id: 'schedule', label: 'Cronograma', icon: Calendar },
  { id: 'approvals', label: 'Aprovações', icon: ClipboardCheck, badge: 'pendingApprovals' },
  { id: 'calendar', label: 'Calendário', icon: CalendarDays },
  { id: 'tasks', label: 'Tarefas', icon: CheckSquare, badge: 'todayTasks' },
  { id: 'employees', label: 'Funcionários', icon: UserCircle },
];

export function Sidebar({ currentPage, onPageChange, pendingApprovals, todayTasks }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const badges: Record<string, number> = {
    pendingApprovals,
    todayTasks,
  };

  return (
    <aside
      className={cn(
        'h-screen sidebar-gradient flex flex-col transition-all duration-300 fixed left-0 top-0 z-40',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg btn-primary-gradient flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-sidebar-foreground">Agency Hub</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-sidebar-accent text-sidebar-muted hover:text-sidebar-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const badgeValue = item.badge ? badges[item.badge] : 0;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-primary/20'
                  : 'text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent'
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                  {badgeValue > 0 && (
                    <span className="px-2 py-0.5 text-xs font-semibold bg-warning text-warning-foreground rounded-full">
                      {badgeValue}
                    </span>
                  )}
                </>
              )}
              {collapsed && badgeValue > 0 && (
                <span className="absolute right-1 top-1 w-2 h-2 bg-warning rounded-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-sidebar-border">
          <div className="text-xs text-sidebar-muted text-center">
            © 2024 Agency Hub
          </div>
        </div>
      )}
    </aside>
  );
}
