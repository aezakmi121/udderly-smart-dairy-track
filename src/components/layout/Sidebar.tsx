
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  Grid2X2
} from 'lucide-react';
import { useUserPermissions } from '@/hooks/useUserPermissions';

const Sidebar = () => {
  const location = useLocation();
  const { canAccess } = useUserPermissions();

  const menuItems = [
    { 
      name: 'Dashboard', 
      href: '/', 
      icon: Home,
      show: canAccess.dashboard
    },
    { 
      name: 'Cows', 
      href: '/cows', 
      icon: Users,
      show: canAccess.cows
    },
    { 
      name: 'Calves', 
      href: '/calves', 
      icon: Baby,
      show: canAccess.calves
    },
    { 
      name: 'Milk Production', 
      href: '/milk-production', 
      icon: Milk,
      show: canAccess.milkProduction
    },
    { 
      name: 'Vaccination', 
      href: '/vaccination', 
      icon: Syringe,
      show: canAccess.vaccination
    },
    { 
      name: 'Weight Logs', 
      href: '/weight-logs', 
      icon: Weight,
      show: canAccess.weightLogs
    },
    { 
      name: 'AI Tracking', 
      href: '/ai-tracking', 
      icon: Heart,
      show: canAccess.aiTracking
    },
    { 
      name: 'Farmers', 
      href: '/farmers', 
      icon: UserPlus,
      show: canAccess.farmers
    },
    { 
      name: 'Milk Collection', 
      href: '/milk-collection', 
      icon: Milk,
      show: canAccess.milkCollection
    },
    { 
      name: 'Feed Management', 
      href: '/feed-management', 
      icon: Wheat,
      show: canAccess.feedManagement
    },
    { 
      name: 'Cow Grouping', 
      href: '/cow-grouping', 
      icon: Grid2X2,
      show: canAccess.cowGrouping
    },
    { 
      name: 'Delivery Boys', 
      href: '/delivery-boys', 
      icon: Truck,
      show: canAccess.deliveryBoys
    },
    { 
      name: 'Customer Management', 
      href: '/customers', 
      icon: Users,
      show: canAccess.customers
    },
    { 
      name: 'Reports', 
      href: '/reports', 
      icon: BarChart3,
      show: canAccess.reports
    },
    { 
      name: 'Settings', 
      href: '/settings', 
      icon: Settings,
      show: canAccess.settings
    },
  ];

  const visibleMenuItems = menuItems.filter(item => item.show);

  return (
    <div className="w-64 bg-white border-r border-gray-200 px-3 py-4 overflow-y-auto">
      <div className="space-y-1">
        {visibleMenuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                location.pathname === item.href
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <Icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default Sidebar;
