
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

export const useUserPermissions = () => {
  const { user } = useAuth();

  const { data: userRole, isLoading } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data?.role || 'worker';
    },
    enabled: !!user?.id
  });

  const isAdmin = userRole === 'admin';
  const isFarmWorker = userRole === 'worker';
  const isCollectionCentre = userRole === 'farmer';

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
    
    // Reports - Admin only for now, can be extended
    reports: isAdmin
  };

  const canDelete = {
    farmers: isAdmin,
    milkCollection: isAdmin
  };

  const canEdit = {
    farmers: isAdmin,
    milkCollection: isAdmin
  };

  return {
    userRole,
    isLoading,
    isAdmin,
    isFarmWorker,
    isCollectionCentre,
    canAccess,
    canDelete,
    canEdit
  };
};
