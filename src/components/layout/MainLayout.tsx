
import React, { useState } from 'react';
import { Navigation } from './Navigation';
import { Sidebar } from './Sidebar';
import { Dashboard } from '../dashboard/Dashboard';
import { CowsManagement } from '../cows/CowsManagement';
import { CalvesManagement } from '../calves/CalvesManagement';
import { MilkProduction } from '../milk/MilkProduction';
import { FarmersManagement } from '../farmers/FarmersManagement';

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
        return <div className="p-8 text-center text-muted-foreground">Vaccination Management - Coming Soon</div>;
      case 'weight-logs':
        return <div className="p-8 text-center text-muted-foreground">Weight Logs - Coming Soon</div>;
      case 'ai-tracking':
        return <div className="p-8 text-center text-muted-foreground">AI Tracking - Coming Soon</div>;
      case 'farmers':
        return <FarmersManagement />;
      case 'milk-collection':
        return <div className="p-8 text-center text-muted-foreground">Milk Collection - Coming Soon</div>;
      case 'feed-management':
        return <div className="p-8 text-center text-muted-foreground">Feed & Stock Management - Coming Soon</div>;
      case 'reports':
        return <div className="p-8 text-center text-muted-foreground">Reports & Analytics - Coming Soon</div>;
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
