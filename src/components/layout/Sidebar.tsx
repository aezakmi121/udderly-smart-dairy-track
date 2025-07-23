import React from 'react';
import { cn } from '@/lib/utils';
import { 
  Home, 
  Users, 
  Baby, 
  Milk, 
  Syringe, 
  Weight, 
  Heart,
  UserPlus,
  Truck,
  BarChart3,
  Settings,
  Wheat,
  Grid2X2,
  ShoppingCart
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
    cowGrouping: boolean;
    deliveryBoys: boolean;
    customers: boolean;
    reports: boolean;
    settings: boolean;
  };
  isCollapsed: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, canAccess, isCollapsed }) => {
  const menuItems = [
    { 
      id: 'dashboard',
      name: 'Dashboard', 
      icon: Home,
      show: canAccess.dashboard
    },
    { 
      id: 'cows',
      name: 'Cows', 
      icon: Users,
      show: canAccess.cows
    },
    { 
      id: 'calves',
      name: 'Calves', 
      icon: Baby,
      show: canAccess.calves
    },
    { 
      id: 'milk-production',
      name: 'Milk Production', 
      icon: Milk,
      show: canAccess.milkProduction
    },
    { 
      id: 'vaccination',
      name: 'Vaccination', 
      icon: Syringe,
      show: canAccess.vaccination
    },
    { 
      id: 'weight-logs',
      name: 'Weight Logs', 
      icon: Weight,
      show: canAccess.weightLogs
    },
    { 
      id: 'ai-tracking',
      name: 'AI Tracking', 
      icon: Heart,
      show: canAccess.aiTracking
    },
    { 
      id: 'farmers',
      name: 'Farmers', 
      icon: UserPlus,
      show: canAccess.farmers
    },
    { 
      id: 'milk-collection',
      name: 'Milk Collection', 
      icon: Milk,
      show: canAccess.milkCollection
    },
    { 
      id: 'feed-management',
      name: 'Feed Management', 
      icon: Wheat,
      show: canAccess.feedManagement
    },
    { 
      id: 'cow-grouping',
      name: 'Cow Grouping', 
      icon: Grid2X2,
      show: canAccess.cowGrouping
    },
    { 
      id: 'delivery-boys',
      name: 'Delivery Boys', 
      icon: Truck,
      show: canAccess.deliveryBoys
    },
    { 
      id: 'customers',
      name: 'Customer Management', 
      icon: Users,
      show: canAccess.customers
    },
    { 
      id: 'reports',
      name: 'Reports', 
      icon: BarChart3,
      show: canAccess.reports
    },
    { 
      id: 'settings',
      name: 'Settings', 
      icon: Settings,
      show: canAccess.settings
    },
  ];

  const visibleMenuItems = menuItems.filter(item => item.show);

  return (
    <div className={cn(
      "bg-white border-r border-gray-200 transition-all duration-300 ease-in-out h-full",
      isCollapsed ? "w-16" : "w-64"
    )}>
      <div className="px-3 py-4 overflow-y-auto h-full">
        <div className="space-y-1">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  'flex items-center px-3 py-3 text-sm font-medium rounded-md transition-colors w-full text-left group touch-manipulation',
                  activeTab === item.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                )}
                title={isCollapsed ? item.name : ''}
              >
                <Icon className={cn("h-5 w-5 flex-shrink-0", isCollapsed ? "" : "mr-3")} />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;