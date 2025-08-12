
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useUserPermissions = () => {
  const { data: roles } = useQuery({
    queryKey: ['user-role'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [] as string[];

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching user roles:', error);
        return [] as string[];
      }

      return (data || []).map(r => r.role);
    },
  });

  const isAdmin = roles?.includes('admin') ?? false;
  const isFarmWorker = roles?.includes('worker') ?? false;
  const isCollectionCentre = roles?.includes('farmer') ?? false;

  const primaryRole = isAdmin ? 'admin' : isFarmWorker ? 'worker' : isCollectionCentre ? 'farmer' : 'worker';

  return {
    userRole: primaryRole,
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
