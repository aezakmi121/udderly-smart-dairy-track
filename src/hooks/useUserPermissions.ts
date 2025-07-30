
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
  const isWorker = userRole === 'worker';
  const isFarmer = userRole === 'farmer';

  return {
    userRole,
    isAdmin,
    isWorker,
    isFarmer,
    canEdit: {
      cows: isAdmin || isWorker,
      calves: isAdmin || isWorker,
      farmers: isAdmin,
      milkProduction: isAdmin || isWorker,
      weightLogs: isAdmin || isWorker,
      vaccination: isAdmin || isWorker,
      aiTracking: isAdmin || isWorker,
      feedManagement: isAdmin || isWorker,
      analytics: isAdmin || isWorker,
    }
  };
};
