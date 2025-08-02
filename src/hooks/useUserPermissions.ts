
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useUserPermissions = () => {
  const { data: userRole } = useQuery({
    queryKey: ['user-role'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        return 'worker'; // Default role
      }

      return data?.role || 'worker';
    },
  });

  const isAdmin = userRole === 'admin';
  const isFarmWorker = userRole === 'worker';
  const isCollectionCentre = userRole === 'farmer';

  return {
    userRole,
    isAdmin,
    isFarmWorker,
    isCollectionCentre,
    canEdit: {
      cows: isAdmin || isFarmWorker,
      calves: isAdmin || isFarmWorker,
      farmers: isAdmin,
      milkProduction: isAdmin || isFarmWorker,
      milkCollection: isAdmin || isCollectionCentre,
      weightLogs: isAdmin || isFarmWorker,
      vaccination: isAdmin || isFarmWorker,
      aiTracking: isAdmin || isFarmWorker,
      feedManagement: isAdmin || isFarmWorker,
      analytics: isAdmin || isFarmWorker,
      settings: isAdmin,
    }
  };
};
