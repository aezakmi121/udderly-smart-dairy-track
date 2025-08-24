import React from 'react';
import { 
  Home, 
  Users, 
  Baby, 
  Milk, 
  Syringe, 
  Weight, 
  Heart,
  UserPlus,
  BarChart3,
  Settings,
  Wheat,
  Grid2X2
} from 'lucide-react';
import { RouteConfig } from '@/types/routes';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { CowsManagement } from '@/components/cows/CowsManagement';
import { CalvesManagement } from '@/components/calves/CalvesManagement';
import { MilkProduction } from '@/components/milk/MilkProduction';
import { MilkCollectionManagement } from '@/components/milk-collection/MilkCollectionManagement';
import { VaccinationManagement } from '@/components/vaccination/VaccinationManagement';
import { FarmersManagement } from '@/components/farmers/FarmersManagement';
import { AITrackingManagement } from '@/components/ai-tracking/AITrackingManagement';
import { WeightLogsManagement } from '@/components/weight/WeightLogsManagement';
import { FeedManagement } from '@/components/feed/FeedManagement';
import { CowGroupingManagement } from '@/components/grouping/CowGroupingManagement';
import { ReportsManagement } from '@/components/reports/ReportsManagement';
import { SettingsManagement } from '@/components/settings/SettingsManagement';

export const routes: RouteConfig[] = [
  {
    path: '/dashboard',
    component: Dashboard,
    label: 'Dashboard',
    icon: Home
  },
  {
    path: '/cows',
    component: CowsManagement,
    permission: 'cows',
    label: 'Cows',
    icon: Users
  },
  {
    path: '/calves',
    component: CalvesManagement,
    label: 'Calves',
    icon: Baby
  },
  {
    path: '/milk-production',
    component: MilkProduction,
    permission: 'milkProduction',
    label: 'Milk Production',
    icon: Milk
  },
  {
    path: '/milk-collection',
    component: MilkCollectionManagement,
    permission: 'milkCollection',
    label: 'Milk Collection',
    icon: Milk
  },
  {
    path: '/vaccination',
    component: VaccinationManagement,
    permission: 'cows',
    label: 'Vaccination',
    icon: Syringe
  },
  {
    path: '/weight-logs',
    component: WeightLogsManagement,
    permission: 'cows',
    label: 'Weight Logs',
    icon: Weight
  },
  {
    path: '/ai-tracking',
    component: AITrackingManagement,
    permission: 'cows',
    label: 'AI Tracking',
    icon: Heart
  },
  {
    path: '/farmers',
    component: FarmersManagement,
    permission: 'farmers',
    label: 'Farmers',
    icon: UserPlus
  },
  {
    path: '/feed-management',
    component: FeedManagement,
    permission: 'cows',
    label: 'Feed Management',
    icon: Wheat
  },
  {
    path: '/cow-grouping',
    component: CowGroupingManagement,
    permission: 'cows',
    label: 'Cow Grouping',
    icon: Grid2X2
  },
  {
    path: '/reports',
    component: ReportsManagement,
    permission: 'analytics',
    label: 'Reports',
    icon: BarChart3
  },
  {
    path: '/settings',
    component: SettingsManagement,
    permission: 'settings',
    label: 'Settings',
    icon: Settings
  }
];

// Helper to get route by path
export const getRouteByPath = (path: string): RouteConfig | undefined => {
  return routes.find(route => route.path === path);
};

// Helper to get all accessible routes for user
export const getAccessibleRoutes = (permissions: any): RouteConfig[] => {
  return routes.filter(route => {
    if (!route.permission) return true;
    return permissions.canEdit[route.permission];
  });
};