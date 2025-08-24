
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { TopBar } from './TopBar';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { routes, getAccessibleRoutes } from '@/config/routes';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const userPermissions = useUserPermissions();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  React.useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarCollapsed(true);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const accessibleRoutes = getAccessibleRoutes(userPermissions);
  
  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setSidebarCollapsed(true);
    }
  };

  return (
    <div className="flex h-screen bg-background relative">
      {/* Mobile overlay */}
      {isMobile && !sidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}
      
      <div className={`${isMobile ? 'fixed inset-y-0 left-0 z-50' : ''} ${sidebarCollapsed && isMobile ? '-translate-x-full' : ''} transition-transform duration-300 ease-in-out`}>
        <Sidebar 
          routes={accessibleRoutes}
          currentPath={location.pathname}
          onNavigate={handleNavigation}
          isCollapsed={sidebarCollapsed && !isMobile}
        />
      </div>
      
      <div className={`flex-1 flex flex-col overflow-hidden ${isMobile ? 'w-full' : ''}`}>
        <TopBar onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
