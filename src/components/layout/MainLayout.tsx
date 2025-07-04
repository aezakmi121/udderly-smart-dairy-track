
import React, { useState } from 'react';
import { Navigation } from './Navigation';
import { Sidebar } from './Sidebar';
import { Dashboard } from '../dashboard/Dashboard';
import { CowsManagement } from '../cows/CowsManagement';
import { CalvesManagement } from '../calves/CalvesManagement';
import { MilkProduction } from '../milk/MilkProduction';
import { VaccinationManagement } from '../vaccination/VaccinationManagement';
import { WeightLogsManagement } from '../weight/WeightLogsManagement';
import { AITrackingManagement } from '../ai-tracking/AITrackingManagement';
import { FarmersManagement } from '../farmers/FarmersManagement';
import { MilkCollectionManagement } from '../milk-collection/MilkCollectionManagement';
import { FeedManagement } from '../feed/FeedManagement';
import { ReportsManagement } from '../reports/ReportsManagement';
import { SettingsManagement } from '../settings/SettingsManagement';
import { useUserPermissions } from '@/hooks/useUserPermissions';

export const MainLayout = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { canAccess, isLoading } = useUserPermissions();

  const renderContent = () => {
    // Show loading state while checking permissions
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'cows':
        return canAccess.cows ? <CowsManagement /> : <AccessDenied />;
      case 'calves':
        return canAccess.calves ? <CalvesManagement /> : <AccessDenied />;
      case 'milk-production':
        return canAccess.milkProduction ? <MilkProduction /> : <AccessDenied />;
      case 'vaccination':
        return canAccess.vaccination ? <VaccinationManagement /> : <AccessDenied />;
      case 'weight-logs':
        return canAccess.weightLogs ? <WeightLogsManagement /> : <AccessDenied />;
      case 'ai-tracking':
        return canAccess.aiTracking ? <AITrackingManagement /> : <AccessDenied />;
      case 'farmers':
        return canAccess.farmers ? <FarmersManagement /> : <AccessDenied />;
      case 'milk-collection':
        return canAccess.milkCollection ? <MilkCollectionManagement /> : <AccessDenied />;
      case 'feed-management':
        return canAccess.feedManagement ? <FeedManagement /> : <AccessDenied />;
      case 'reports':
        return canAccess.reports ? <ReportsManagement /> : <AccessDenied />;
      case 'settings':
        return canAccess.settings ? <SettingsManagement /> : <AccessDenied />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <Navigation />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 bg-white shadow-sm border-r overflow-y-auto">
          <Sidebar 
            activeTab={activeTab} 
            onTabChange={setActiveTab}
            canAccess={canAccess}
          />
        </div>
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

const AccessDenied = () => (
  <div className="flex flex-col items-center justify-center h-64 space-y-4">
    <div className="text-6xl">🔒</div>
    <h2 className="text-2xl font-bold text-gray-600">Access Restricted</h2>
    <p className="text-gray-500 text-center max-w-md">
      You don't have permission to access this section. Please contact your administrator if you need access.
    </p>
  </div>
);
