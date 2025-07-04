
import React from 'react';
import { cn } from '@/lib/utils';
import { 
  Home, 
  Cow, 
  Baby, 
  Milk, 
  Syringe, 
  Scale, 
  Heart, 
  Users, 
  Droplets, 
  Wheat, 
  BarChart3, 
  Settings 
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  canAccess: {
    dashboard: boolean;
    cows: boolean;
    calves: boolean;
    milkProduction: boolean;
    vaccination: boolean;
    weightLogs: boolean;
    aiTracking: boolean;
    farmers: boolean;
    milkCollection: boolean;
    feedManagement: boolean;
    reports: boolean;
    settings: boolean;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, canAccess }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, show: canAccess.dashboard },
    { id: 'cows', label: 'Cows', icon: Cow, show: canAccess.cows },
    { id: 'calves', label: 'Calves', icon: Baby, show: canAccess.calves },
    { id: 'milk-production', label: 'Milk Production', icon: Milk, show: canAccess.milkProduction },
    { id: 'vaccination', label: 'Vaccination', icon: Syringe, show: canAccess.vaccination },
    { id: 'weight-logs', label: 'Weight Logs', icon: Scale, show: canAccess.weightLogs },
    { id: 'ai-tracking', label: 'AI Tracking', icon: Heart, show: canAccess.aiTracking },
    { id: 'farmers', label: 'Farmers', icon: Users, show: canAccess.farmers },
    { id: 'milk-collection', label: 'Milk Collection', icon: Droplets, show: canAccess.milkCollection },
    { id: 'feed-management', label: 'Feed Management', icon: Wheat, show: canAccess.feedManagement },
    { id: 'reports', label: 'Reports', icon: BarChart3, show: canAccess.reports },
    { id: 'settings', label: 'Settings', icon: Settings, show: canAccess.settings },
  ];

  return (
    <nav className="p-4 space-y-2">
      {menuItems.filter(item => item.show).map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              'w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors',
              activeTab === item.id
                ? 'bg-green-100 text-green-700 font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            )}
          >
            <Icon className="h-5 w-5" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
