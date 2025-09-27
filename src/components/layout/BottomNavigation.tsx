import React from 'react';
import { RouteConfig } from '@/types/routes';
import { cn } from '@/lib/utils';

interface BottomNavigationProps {
  routes: RouteConfig[];
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  routes,
  currentPath,
  onNavigate,
}) => {
  // Filter to show only key routes in bottom nav (max 4-5 items)
  const bottomNavRoutes = routes.filter(route => {
    // Show different routes based on user role
    const keyRoutes = ['/dashboard', '/milk-production', '/milk-collection', '/ai-tracking', '/expenses'];
    return keyRoutes.includes(route.path);
  }).slice(0, 4);

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
      <div className="flex items-center justify-around px-2 py-2 safe-area-pb">
        {bottomNavRoutes.map((route) => {
          const Icon = route.icon;
          const isActive = currentPath === route.path;
          
          return (
            <button
              key={route.path}
              onClick={() => onNavigate(route.path)}
              className={cn(
                'flex flex-col items-center justify-center p-2 min-w-[60px] rounded-lg touch-manipulation transition-all duration-200',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <Icon className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium truncate max-w-[50px]">
                {route.label.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};