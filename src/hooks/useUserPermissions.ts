
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

export const useUserPermissions = () => {
  const { user } = useAuth();

  const { data: userRole, isLoading } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data } = await (supabase as any).rpc('get_user_role', {
        _user_id: user.id
      });
      
      return data;
    },
    enabled: !!user?.id
  });

  const isAdmin = userRole === 'admin';
  const isFarmer = userRole === 'farmer';
  const isWorker = userRole === 'worker';
  const isDeliveryBoy = userRole === 'delivery_boy';
  const isStoreManager = userRole === 'store_manager';

  const canAccess = {
    dashboard: true, // Everyone can access dashboard
    cows: isAdmin || isWorker,
    calves: isAdmin || isWorker,
    milkProduction: isAdmin || isWorker,
    vaccination: isAdmin || isWorker,
    weightLogs: isAdmin || isWorker,
    aiTracking: isAdmin || isWorker,
    farmers: isAdmin || isWorker || isFarmer,
    milkCollection: isAdmin || isWorker || isFarmer,
    feedManagement: isAdmin || isWorker,
    deliveryBoys: isAdmin || isStoreManager,
    customers: isAdmin || isStoreManager || isDeliveryBoy,
    reports: isAdmin || isWorker || isFarmer,
    settings: isAdmin
  };

  const canEdit = {
    cows: isAdmin || isWorker,
    calves: isAdmin || isWorker,
    milkProduction: isAdmin || isWorker,
    vaccination: isAdmin || isWorker,
    weightLogs: isAdmin || isWorker,
    aiTracking: isAdmin || isWorker,
    farmers: isAdmin || isWorker,
    milkCollection: isAdmin || isWorker || isFarmer,
    feedManagement: isAdmin || isWorker,
    deliveryBoys: isAdmin || isStoreManager,
    customers: isAdmin || isStoreManager,
    reports: isAdmin,
    settings: isAdmin
  };

  return {
    userRole,
    canAccess,
    canEdit,
    isLoading,
    isAdmin,
    isFarmer,
    isWorker,
    isDeliveryBoy,
    isStoreManager
  };
};
