
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
        return [] as string[];
      }

      return (data || []).map(r => r.role);
    },
  });

  const isAdmin = roles?.includes('admin') ?? false;
  const isFarmWorker = roles?.includes('worker') ?? false;
  const isCollectionCentre = roles?.includes('farmer') ?? false;
  const hasNoRole = !roles || roles.length === 0;

  const primaryRole = isAdmin ? 'admin' : isFarmWorker ? 'worker' : isCollectionCentre ? 'farmer' : hasNoRole ? 'none' : 'worker';

  return {
    userRole: primaryRole,
    isAdmin,
    isFarmWorker,
    isCollectionCentre,
    hasNoRole,
    canEdit: {
      cows: !hasNoRole && (isAdmin || isFarmWorker),
      calves: !hasNoRole && (isAdmin || isFarmWorker),
      farmers: !hasNoRole && isAdmin,
      milkProduction: !hasNoRole && (isAdmin || isFarmWorker),
      milkCollection: !hasNoRole && (isAdmin || isCollectionCentre),
      weightLogs: !hasNoRole && (isAdmin || isFarmWorker),
      vaccination: !hasNoRole && (isAdmin || isFarmWorker),
      aiTracking: !hasNoRole && (isAdmin || isFarmWorker),
      feedManagement: !hasNoRole && (isAdmin || isFarmWorker),
      analytics: !hasNoRole && (isAdmin || isFarmWorker),
      settings: !hasNoRole && isAdmin,
    }
  };
};
