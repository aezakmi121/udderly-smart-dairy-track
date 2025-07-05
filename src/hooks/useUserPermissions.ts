
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

export const useUserPermissions = () => {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .order('assigned_at', { ascending: false })
          .limit(1);

        if (error) throw error;
        
        setUserRole(data?.[0]?.role || 'worker');
      } catch (error) {
        console.error('Error fetching user role:', error);
        setUserRole('worker'); // Default role
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  const canAccess = {
    dashboard: true,
    cows: userRole === 'admin' || userRole === 'worker',
    calves: userRole === 'admin' || userRole === 'worker',
    milkProduction: userRole === 'admin' || userRole === 'worker',
    vaccination: userRole === 'admin' || userRole === 'worker',
    weightLogs: userRole === 'admin' || userRole === 'worker',
    aiTracking: userRole === 'admin' || userRole === 'worker',
    farmers: userRole === 'admin' || userRole === 'worker' || userRole === 'farmer',
    milkCollection: userRole === 'admin' || userRole === 'worker' || userRole === 'farmer',
    feedManagement: userRole === 'admin' || userRole === 'worker',
    cowGrouping: userRole === 'admin' || userRole === 'worker',
    deliveryBoys: userRole === 'admin' || userRole === 'store_manager',
    customers: userRole === 'admin' || userRole === 'store_manager',
    reports: userRole === 'admin' || userRole === 'store_manager' || userRole === 'worker',
    settings: userRole === 'admin'
  };

  const canDelete = {
    cows: userRole === 'admin',
    calves: userRole === 'admin',
    milkProduction: userRole === 'admin' || userRole === 'worker',
    vaccination: userRole === 'admin',
    weightLogs: userRole === 'admin',
    aiTracking: userRole === 'admin',
    farmers: userRole === 'admin',
    milkCollection: userRole === 'admin',
    feedManagement: userRole === 'admin',
    cowGrouping: userRole === 'admin',
    deliveryBoys: userRole === 'admin',
    customers: userRole === 'admin'
  };

  const canEdit = {
    cows: userRole === 'admin' || userRole === 'worker',
    calves: userRole === 'admin' || userRole === 'worker',
    milkProduction: userRole === 'admin' || userRole === 'worker',
    vaccination: userRole === 'admin' || userRole === 'worker',
    weightLogs: userRole === 'admin' || userRole === 'worker',
    aiTracking: userRole === 'admin' || userRole === 'worker',
    farmers: userRole === 'admin' || userRole === 'worker',
    milkCollection: userRole === 'admin' || userRole === 'worker',
    feedManagement: userRole === 'admin' || userRole === 'worker',
    cowGrouping: userRole === 'admin' || userRole === 'worker',
    deliveryBoys: userRole === 'admin' || userRole === 'store_manager',
    customers: userRole === 'admin' || userRole === 'store_manager'
  };

  return {
    userRole,
    canAccess,
    canDelete,
    canEdit,
    isLoading
  };
};
