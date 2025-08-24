export interface RouteConfig {
  path: string;
  component: React.ComponentType<any>;
  permission?: keyof UserPermissions;
  label: string;
  icon: React.ComponentType<any>;
}

export interface UserPermissions {
  cows: boolean;
  milkProduction: boolean;
  farmers: boolean;
  milkCollection: boolean;
  analytics: boolean;
  settings: boolean;
}