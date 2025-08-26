import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CowMilkingUpdate {
  needs_milking_move?: boolean;
  needs_milking_move_at?: string | null;
  moved_to_milking?: boolean;
  moved_to_milking_at?: string | null;
}

export const useCowMilkingStatus = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateCowMilkingStatus = useMutation({
    mutationFn: async ({ cowId, updates }: { cowId: string; updates: CowMilkingUpdate }) => {
      const { error } = await supabase
        .from('cows')
        .update(updates)
        .eq('id', cowId);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate all relevant queries to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ['cows-list'] });
      queryClient.invalidateQueries({ queryKey: ['ai-tracking'] });
      queryClient.invalidateQueries({ queryKey: ['ai-records'] });
      queryClient.invalidateQueries({ queryKey: ['cows'] });
      toast({
        title: "Success",
        description: "Cow status updated successfully",
      });
    },
    onError: (error) => {
      console.error('Error updating cow milking status:', error);
      toast({
        title: "Error",
        description: "Failed to update cow status",
        variant: "destructive",
      });
    }
  });

  return {
    updateCowMilkingStatus,
    isUpdating: updateCowMilkingStatus.isPending
  };
};