
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

export const MainLayout = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'cows':
        return <CowsManagement />;
      case 'calves':
        return <CalvesManagement />;
      case 'milk-production':
        return <MilkProduction />;
      case 'vaccination':
        return <VaccinationManagement />;
      case 'weight-logs':
        return <WeightLogsManagement />;
      case 'ai-tracking':
        return <AITrackingManagement />;
      case 'farmers':
        return <FarmersManagement />;
      case 'milk-collection':
        return <MilkCollectionManagement />;
      case 'feed-management':
        return <FeedManagement />;
      case 'reports':
        return <ReportsManagement />;
      case 'settings':
        return <SettingsManagement />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <Navigation />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 bg-white shadow-sm border-r overflow-y-auto">
          <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};
