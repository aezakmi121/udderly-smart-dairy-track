
import React, { useState } from 'react';
import { Navigation } from './Navigation';
import { Sidebar } from './Sidebar';
import { Dashboard } from '../dashboard/Dashboard';

export const MainLayout = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'cows':
        return <div>Cows Management - Coming Soon</div>;
      case 'calves':
        return <div>Calves Management - Coming Soon</div>;
      case 'milk-production':
        return <div>Milk Production - Coming Soon</div>;
      case 'vaccination':
        return <div>Vaccination Management - Coming Soon</div>;
      case 'weight-logs':
        return <div>Weight Logs - Coming Soon</div>;
      case 'ai-tracking':
        return <div>AI Tracking - Coming Soon</div>;
      case 'farmers':
        return <div>Farmers Management - Coming Soon</div>;
      case 'milk-collection':
        return <div>Milk Collection - Coming Soon</div>;
      case 'feed-management':
        return <div>Feed & Stock Management - Coming Soon</div>;
      case 'reports':
        return <div>Reports & Analytics - Coming Soon</div>;
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
