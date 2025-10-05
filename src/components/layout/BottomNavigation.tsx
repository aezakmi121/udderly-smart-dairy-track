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
  }).slice(0, 5);

  // Custom labels for bottom navigation
  const getBottomNavLabel = (label: string, path: string) => {
    const labelMap: { [key: string]: string } = {
      '/dashboard': 'Home',
      '/milk-production': 'Production',
      '/milk-collection': 'Collection',
      '/ai-tracking': 'AI Track',
      '/expenses': 'Expenses'
    };
    return labelMap[path] || label.split(' ')[0];
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
      <div className="flex items-center justify-around px-2 py-2" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
        {bottomNavRoutes.map((route) => {
          const Icon = route.icon;
          const isActive = currentPath === route.path;
          
          return (
            <button
              key={route.path}
              onClick={() => onNavigate(route.path)}
              className={cn(
                'flex flex-col items-center justify-center p-1.5 min-w-[60px] rounded-lg touch-manipulation transition-all duration-200',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <Icon className="h-6 w-6 mb-0.5" />
              <span className="text-[11px] font-medium leading-tight text-center">
                {getBottomNavLabel(route.label, route.path)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};