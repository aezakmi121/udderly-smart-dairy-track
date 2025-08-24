import React from 'react';
import { cn } from '@/lib/utils';
import { RouteConfig } from '@/types/routes';

interface SidebarProps {
  routes: RouteConfig[];
  currentPath: string;
  onNavigate: (path: string) => void;
  isCollapsed: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ routes, currentPath, onNavigate, isCollapsed }) => {

  return (
    <div className={cn(
      "bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out h-full",
      isCollapsed ? "w-16" : "w-64"
    )}>
      <div className="px-3 py-4 overflow-y-auto h-full">
        <div className="space-y-1">
          {routes.map((route) => {
            const Icon = route.icon;
            const isActive = currentPath === route.path;
            return (
              <button
                key={route.path}
                onClick={() => onNavigate(route.path)}
                className={cn(
                  'flex items-center px-3 py-3 text-sm font-medium rounded-md transition-colors w-full text-left group touch-manipulation',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50 active:bg-sidebar-accent'
                )}
                title={isCollapsed ? route.label : ''}
              >
                <Icon className={cn("h-5 w-5 flex-shrink-0", isCollapsed ? "" : "mr-3")} />
                {!isCollapsed && <span className="truncate">{route.label}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;