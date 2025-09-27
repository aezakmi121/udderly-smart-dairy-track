
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { TopBar } from './TopBar';
import { BottomNavigation } from './BottomNavigation';
import { getAccessibleRoutes } from '@/config/routes';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useIsMobile } from '@/hooks/use-mobile';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const permissions = useUserPermissions();

  useEffect(() => {
    if (isMobile) {
      setSidebarCollapsed(true);
    }
  }, [isMobile]);

  const accessibleRoutes = getAccessibleRoutes(permissions);
  
  // Routes shown in bottom navigation (mobile only)
  const bottomNavPaths = ['/dashboard', '/milk-production', '/milk-collection', '/ai-tracking', '/expenses'];
  
  // Filter sidebar routes to exclude those in bottom nav when on mobile
  const sidebarRoutes = isMobile 
    ? accessibleRoutes.filter(route => !bottomNavPaths.includes(route.path))
    : accessibleRoutes;

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setSidebarCollapsed(true);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Mobile overlay */}
      {isMobile && !sidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}
      
      {/* Sidebar - hidden on mobile */}
      <div className={`${isMobile ? 'fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out' : 'relative'} ${
        isMobile && sidebarCollapsed ? '-translate-x-full' : ''
      }`}>
        <Sidebar
          routes={sidebarRoutes}
          currentPath={location.pathname}
          onNavigate={handleNavigation}
          isCollapsed={!isMobile && sidebarCollapsed}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <main className="flex-1 overflow-auto p-3 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
        
        {/* Bottom Navigation - only on mobile */}
        <BottomNavigation
          routes={accessibleRoutes}
          currentPath={location.pathname}
          onNavigate={handleNavigation}
        />
      </div>
    </div>
  );
};
