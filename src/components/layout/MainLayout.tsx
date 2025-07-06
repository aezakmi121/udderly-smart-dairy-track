
import React from 'react';
import Sidebar from './Sidebar';
import { Navigation } from './Navigation';
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
  currentView: string;
}

export const MainLayout = ({ currentView }: MainLayoutProps) => {
  const { canEdit } = useUserPermissions();

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'cows':
        return canEdit.cows ? <CowsManagement /> : <div>Access Denied</div>;
      case 'calves':
        return <CalvesManagement />;
      case 'milk-production':
        return canEdit.milkProduction ? <MilkProduction /> : <div>Access Denied</div>;
      case 'milk-collection':
        return canEdit.milkProduction ? <MilkCollectionManagement /> : <div>Access Denied</div>;
      case 'vaccination':
        return canEdit.cows ? <VaccinationManagement /> : <div>Access Denied</div>;
      case 'farmers':
        return canEdit.farmers ? <FarmersManagement /> : <div>Access Denied</div>;
      case 'ai-tracking':
        return canEdit.cows ? <AITrackingManagement /> : <div>Access Denied</div>;
      case 'weight':
        return canEdit.cows ? <WeightLogsManagement /> : <div>Access Denied</div>;
      case 'feed':
        return canEdit.cows ? <FeedManagement /> : <div>Access Denied</div>;
      case 'grouping':
        return canEdit.cows ? <CowGroupingManagement /> : <div>Access Denied</div>;
      case 'reports':
        return canEdit.analytics ? <ReportsManagement /> : <div>Access Denied</div>;
      case 'settings':
        return <SettingsManagement />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navigation />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};
