
import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Beef,
  Baby,
  Syringe,
  Scale,
  Milk,
  Users,
  ShoppingCart,
  Heart,
  BarChart3,
  Settings,
  Package
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'cows', label: 'Cows', icon: Beef },
  { id: 'calves', label: 'Calves', icon: Baby },
  { id: 'milk-production', label: 'Milk Production', icon: Milk },
  { id: 'vaccination', label: 'Vaccination', icon: Syringe },
  { id: 'weight-logs', label: 'Weight Logs', icon: Scale },
  { id: 'ai-tracking', label: 'AI Tracking', icon: Heart },
  { id: 'farmers', label: 'Farmers', icon: Users },
  { id: 'milk-collection', label: 'Milk Collection', icon: ShoppingCart },
  { id: 'feed-management', label: 'Feed & Stock', icon: Package },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="pb-12">
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <div className="space-y-1">
            {menuItems.map((item) => (
              <Button
                key={item.id}
                variant={activeTab === item.id ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  activeTab === item.id && "bg-green-100 text-green-700"
                )}
                onClick={() => onTabChange(item.id)}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
