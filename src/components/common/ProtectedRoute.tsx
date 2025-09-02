import React from 'react';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { UserPermissions } from '@/types/routes';
import { AccessPendingScreen } from './AccessPendingScreen';

interface ProtectedRouteProps {
  children: React.ReactNode;
  permission?: keyof UserPermissions;
  fallback?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  permission,
  fallback = <div className="text-center py-8 text-muted-foreground">Access Denied</div>
}) => {
  const { canEdit, hasNoRole } = useUserPermissions();
  
  // Show access pending screen if user has no role assigned
  if (hasNoRole) {
    return <AccessPendingScreen />;
  }
  
  if (!permission) {
    return <>{children}</>;
  }
  
  const hasPermission = canEdit[permission];
  
  return hasPermission ? <>{children}</> : <>{fallback}</>;
};