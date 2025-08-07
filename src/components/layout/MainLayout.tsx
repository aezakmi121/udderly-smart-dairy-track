
import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { TopBar } from './TopBar';
import { Outlet } from 'react-router-dom';
import { CowsManagement } from '@/components/cows/CowsManagement';
import { CalvesManagement } from '@/components/calves/CalvesManagement';
import { MilkProduction } from '@/components/milk/MilkProduction';
import { MilkCollectionManagement } from '@/components/milk-collection/MilkCollectionManagement';
import { VaccinationManagement } from '@/components/vaccination/VaccinationManagement';
import { FarmersManagement } from '@/components/farmers/FarmersManagement';
import { AITrackingManagement  } from '@/components/ai-tracking/AITrackingManagement';
import { WeightLogsManagement } from '@/components/weight/WeightLogsManagement';
import { FeedManagement } from '@/components/feed/FeedManagement';
import { CowGroupingManagement } from '@/components/grouping/CowGroupingManagement';
import { ReportsManagement } from '@/components/reports/ReportsManagement';
import { SettingsManagement } from '@/components/settings/SettingsManagement';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { useUserPermissions } from '@/hooks/useUserPermissions';

interface MainLayoutProps {
  currentView?: string;
}

export const MainLayout = ({ currentView }: MainLayoutProps) => {
  const { canEdit } = useUserPermissions();
  const [activeTab, setActiveTab] = useState(currentView || 'dashboard');
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
    handleResize(); // Check initial size

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const canAccess = {
    dashboard: true,
    cows: canEdit.cows,
    calves: true,
    milkProduction: canEdit.milkProduction,
    vaccination: canEdit.cows,
    weightLogs: canEdit.cows,
    aiTracking: canEdit.cows,
    farmers: canEdit.farmers,
    milkCollection: canEdit.milkCollection,
    feedManagement: canEdit.cows,
    cowGrouping: canEdit.cows,
    deliveryBoys: false,
    customers: false,
    reports: canEdit.analytics,
    settings: canEdit.settings,
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'cows':
        return canEdit.cows ? <CowsManagement /> : <div>Access Denied</div>;
      case 'calves':
        return <CalvesManagement />;
      case 'milk-production':
        return canEdit.milkProduction ? <MilkProduction /> : <div>Access Denied</div>;
      case 'milk-collection':
        return canEdit.milkCollection ? <MilkCollectionManagement /> : <div>Access Denied</div>;
      case 'vaccination':
        return canEdit.cows ? <VaccinationManagement /> : <div>Access Denied</div>;
      case 'farmers':
        return canEdit.farmers ? <FarmersManagement /> : <div>Access Denied</div>;
      case 'ai-tracking':
        return canEdit.cows ? <AITrackingManagement /> : <div>Access Denied</div>;
      case 'weight-logs':
        return canEdit.cows ? <WeightLogsManagement /> : <div>Access Denied</div>;
      case 'feed-management':
        return canEdit.cows ? <FeedManagement /> : <div>Access Denied</div>;
      case 'cow-grouping':
        return canEdit.cows ? <CowGroupingManagement /> : <div>Access Denied</div>;
      case 'reports':
        return canEdit.analytics ? <ReportsManagement /> : <div>Access Denied</div>;
      case 'settings':
        return <SettingsManagement />;
      default:
        return <Dashboard />;
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (isMobile) {
      setSidebarCollapsed(true);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 relative">
      {/* Mobile overlay */}
      {isMobile && !sidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}
      
      <div className={`${isMobile ? 'fixed inset-y-0 left-0 z-50' : ''} ${sidebarCollapsed && isMobile ? '-translate-x-full' : ''} transition-transform duration-300 ease-in-out`}>
        <Sidebar 
          activeTab={activeTab} 
          onTabChange={handleTabChange} 
          canAccess={canAccess}
          isCollapsed={sidebarCollapsed && !isMobile}
        />
      </div>
      
      <div className={`flex-1 flex flex-col overflow-hidden ${isMobile ? 'w-full' : ''}`}>
        <TopBar onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 md:p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};
