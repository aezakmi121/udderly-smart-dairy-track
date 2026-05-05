import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BankAccount {
  id: string;
  name: string;
  bank_name: string;
  last4: string | null;
  source_id: string | null;
  is_active: boolean;
  created_at: string;
}

export const useBankAccounts = () => {
  const qc = useQueryClient();
  const { toast } = useToast();

  const list = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as BankAccount[];
    },
  });

  const create = useMutation({
    mutationFn: async (payload: { name: string; bank_name: string; last4?: string }) => {
      // Auto-create matching expense source
      const sourceName = `${payload.bank_name}${payload.last4 ? ' ••' + payload.last4 : ''}`;
      const { data: src, error: srcErr } = await supabase
        .from('expense_sources')
        .insert({ name: sourceName, description: 'Auto-created for bank account' })
        .select('id')
        .single();
      if (srcErr) throw srcErr;

      const { error } = await supabase.from('bank_accounts').insert({
        name: payload.name,
        bank_name: payload.bank_name,
        last4: payload.last4 || null,
        source_id: src.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bank-accounts'] });
      qc.invalidateQueries({ queryKey: ['expense-sources'] });
      toast({ title: 'Bank account added' });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('bank_accounts').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bank-accounts'] });
      toast({ title: 'Bank account removed' });
    },
  });

  return { ...list, create, remove };
};
