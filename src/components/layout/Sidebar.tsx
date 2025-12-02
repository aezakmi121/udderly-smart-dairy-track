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
      "bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out h-full flex flex-col",
      isCollapsed ? "w-16" : "w-64"
    )}>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {routes.map((route) => {
            const Icon = route.icon;
            const isActive = currentPath === route.path;
            return (
              <button
                key={route.path}
                onClick={() => onNavigate(route.path)}
                className={cn(
                  'flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors w-full text-left group touch-manipulation min-h-[44px]',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50 active:bg-sidebar-accent'
                )}
                title={isCollapsed ? route.label : ''}
              >
                <Icon className={cn("h-4 w-4 flex-shrink-0", isCollapsed ? "" : "mr-2")} />
                {!isCollapsed && <span className="truncate text-sm">{route.label}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;