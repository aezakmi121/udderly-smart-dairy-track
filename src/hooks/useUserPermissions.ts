
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

export const useUserPermissions = () => {
  const { user } = useAuth();

  const { data: userRoles, isLoading } = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data?.map(r => r.role) || [];
    },
    enabled: !!user?.id
  });

  const roles = userRoles || [];
  const isAdmin = roles.includes('admin' as any);
  const isFarmWorker = roles.includes('worker' as any);
  const isCollectionCentre = roles.includes('farmer' as any);
  const isDeliveryBoy = roles.includes('delivery_boy' as any);
  const isStoreManager = roles.includes('store_manager' as any);

  const canAccess = {
    // Admin has access to everything
    dashboard: true,
    settings: isAdmin,
    
    // Farm operations - Admin and Farm Workers
    cows: isAdmin || isFarmWorker,
    calves: isAdmin || isFarmWorker,
    milkProduction: isAdmin || isFarmWorker,
    vaccination: isAdmin || isFarmWorker,
    weightLogs: isAdmin || isFarmWorker,
    aiTracking: isAdmin || isFarmWorker,
    feedManagement: isAdmin || isFarmWorker,
    
    // Collection centre operations - Admin and Collection Centre
    farmers: isAdmin || isCollectionCentre,
    milkCollection: isAdmin || isCollectionCentre,
    
    // Delivery management - Admin, Store Manager, Delivery Boy
    deliveryBoys: isAdmin || isStoreManager,
    customers: isAdmin || isStoreManager || isDeliveryBoy,
    deliveryOrders: isAdmin || isStoreManager || isDeliveryBoy,
    
    // Reports - Admin only for now, can be extended
    reports: isAdmin
  };

  const canDelete = {
    farmers: isAdmin,
    milkCollection: isAdmin,
    deliveryBoys: isAdmin,
    customers: isAdmin || isStoreManager,
    deliveryOrders: isAdmin || isStoreManager
  };

  const canEdit = {
    farmers: isAdmin,
    milkCollection: isAdmin,
    deliveryBoys: isAdmin || isStoreManager,
    customers: isAdmin || isStoreManager,
    deliveryOrders: isAdmin || isStoreManager || isDeliveryBoy
  };

  return {
    userRoles: roles,
    isLoading,
    isAdmin,
    isFarmWorker,
    isCollectionCentre,
    isDeliveryBoy,
    isStoreManager,
    canAccess,
    canDelete,
    canEdit
  };
};
