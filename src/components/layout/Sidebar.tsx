import { useState } from 'react';
import {
  Squares2X2Icon,
  LightBulbIcon,
  UserGroupIcon,
  CalendarIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClipboardDocumentCheckIcon,
  UserCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowLeftOnRectangleIcon,
  RocketLaunchIcon,
  ChatBubbleLeftIcon,
} from '@heroicons/react/24/outline';
import {
  Squares2X2Icon as Squares2X2IconSolid,
  LightBulbIcon as LightBulbIconSolid,
  UserGroupIcon as UserGroupIconSolid,
  CalendarIcon as CalendarIconSolid,
  CalendarDaysIcon as CalendarDaysIconSolid,
  CheckCircleIcon as CheckCircleIconSolid,
  ClipboardDocumentCheckIcon as ClipboardDocumentCheckIconSolid,
  UserCircleIcon as UserCircleIconSolid,
  RocketLaunchIcon as RocketLaunchIconSolid,
  ChatBubbleLeftIcon as ChatBubbleLeftIconSolid,
} from '@heroicons/react/24/solid';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  pendingApprovals: number;
  todayTasks: number;
  availableMissions: number;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Squares2X2Icon, iconSolid: Squares2X2IconSolid },
  { id: 'ideas', label: 'Ideias', icon: LightBulbIcon, iconSolid: LightBulbIconSolid },
  { id: 'clients', label: 'Clientes', icon: UserGroupIcon, iconSolid: UserGroupIconSolid },
  { id: 'schedule', label: 'Cronograma', icon: CalendarIcon, iconSolid: CalendarIconSolid },
  { id: 'approvals', label: 'Aprovações', icon: ClipboardDocumentCheckIcon, iconSolid: ClipboardDocumentCheckIconSolid, badge: 'pendingApprovals' },
  { id: 'calendar', label: 'Calendário', icon: CalendarDaysIcon, iconSolid: CalendarDaysIconSolid },
  { id: 'tasks', label: 'Tarefas', icon: CheckCircleIcon, iconSolid: CheckCircleIconSolid, badge: 'todayTasks' },
  { id: 'employees', label: 'Funcionários', icon: UserCircleIcon, iconSolid: UserCircleIconSolid },
  { id: 'missions', label: 'Missões', icon: RocketLaunchIcon, iconSolid: RocketLaunchIconSolid, badge: 'availableMissions' },
  { id: 'suggestions', label: 'Sugestões', icon: ChatBubbleLeftIcon, iconSolid: ChatBubbleLeftIconSolid },
];

export function Sidebar({ currentPage, onPageChange, pendingApprovals, todayTasks, availableMissions }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuário';
  const userRole = user?.user_metadata?.role || 'Funcionário';

  const badges: Record<string, number> = {
    pendingApprovals,
    todayTasks,
    availableMissions,
  };

  return (
    <aside
      className={cn(
        'h-screen bg-black flex flex-col transition-all duration-300 fixed left-0 top-0 z-40',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-5">
            <img 
              src="/LOGO-LABS.png" 
              alt="Okto Lab" 
              className="h-14 w-auto object-contain"
            />
          </div>
        )}
        {collapsed && (
          <div className="flex items-center justify-center w-full">
            <img 
              src="/LOGO-LABS.png" 
              alt="Okto Lab" 
              className="h-8 w-auto object-contain"
            />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-sidebar-accent text-sidebar-muted hover:text-sidebar-foreground transition-colors"
        >
          {collapsed ? <ChevronRightIcon className="w-4 h-4" /> : <ChevronLeftIcon className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const badgeValue = item.badge ? badges[item.badge] : 0;
          const isActive = currentPage === item.id;
          const Icon = isActive ? item.iconSolid : item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-sm transition-all duration-200 relative',
                isActive
                  ? ' bg-blue-500 text-[#ffffff] '
                  : 'text-[#7c758b] hover:text-sidebar-foreground '
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                  {badgeValue > 0 && (
                    <>
                      {item.id === 'missions' ? (
                        <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs font-semibold flex items-center justify-center flex-shrink-0">
                          {badgeValue}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs font-semibold bg-warning text-warning-foreground rounded-full">
                          {badgeValue}
                        </span>
                      )}
                    </>
                  )}
                </>
              )}
              {collapsed && badgeValue > 0 && (
                <span className={cn(
                  "absolute right-1 top-1 rounded-full flex items-center justify-center",
                  item.id === 'missions' 
                    ? "w-5 h-5 bg-red-500 text-white text-xs font-semibold" 
                    : "w-2 h-2 bg-warning"
                )}>
                  {item.id === 'missions' && badgeValue}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        {!collapsed && user && (
          <div className="mb-3 px-2">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{userName}</p>
            <p className="text-xs text-sidebar-muted truncate">{userRole}</p>
          </div>
        )}
        <button
          onClick={logout}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
            'text-sidebar-muted hover:text-destructive hover:bg-destructive/10'
          )}
        >
          <ArrowLeftOnRectangleIcon className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Sair</span>}
        </button>
      </div>
    </aside>
  );
}
