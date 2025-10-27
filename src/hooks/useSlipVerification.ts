import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SlipVerification {
  id: string;
  verification_date: string;
  session: 'morning' | 'evening';
  farmer_id: string;
  recorded_quantity: number;
  slip_quantity: number;
  difference: number;
  status: 'pending' | 'verified' | 'discrepancy';
  admin_notes?: string;
  farmers?: {
    name: string;
    farmer_code: string;
  };
}

export const useSlipVerification = (selectedDate: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: verifications, isLoading } = useQuery({
    queryKey: ['slip-verification', selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('slip_verification')
        .select(`
          *,
          farmers (
            name,
            farmer_code
          )
        `)
        .eq('verification_date', selectedDate)
        .order('session', { ascending: true });
      
      if (error) throw error;
      return data as SlipVerification[];
    }
  });

  const updateVerificationMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SlipVerification> & { id: string }) => {
      const { data, error } = await supabase
        .from('slip_verification')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slip-verification'] });
      toast({ title: "Verification updated successfully!" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error updating verification", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Auto-generate slip verifications based on milk collections
  const generateVerificationsMutation = useMutation({
    mutationFn: async ({ date, session }: { date: string; session: 'morning' | 'evening' }) => {
      // Get all milk collections for the date/session
      const { data: collections, error: fetchError } = await supabase
        .from('milk_collections')
        .select('farmer_id, quantity')
        .eq('collection_date', date)
        .eq('session', session);
      
      if (fetchError) throw fetchError;

      // Group by farmer
      const farmerTotals: Record<string, number> = {};
      collections?.forEach(c => {
        if (c.farmer_id) {
          farmerTotals[c.farmer_id] = (farmerTotals[c.farmer_id] || 0) + Number(c.quantity);
        }
      });

      // Insert verification records
      const verifications = Object.entries(farmerTotals).map(([farmer_id, recorded_quantity]) => ({
        verification_date: date,
        session,
        farmer_id,
        recorded_quantity,
        slip_quantity: 0, // To be filled by admin
        status: 'pending' as const
      }));

      const { error: insertError } = await supabase
        .from('slip_verification')
        .insert(verifications);
      
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slip-verification'] });
      toast({ title: "Verifications generated successfully!" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error generating verifications", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  return {
    verifications,
    isLoading,
    updateVerificationMutation,
    generateVerificationsMutation
  };
};
