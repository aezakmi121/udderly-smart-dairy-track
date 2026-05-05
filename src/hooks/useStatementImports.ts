import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface StatementImport {
  id: string;
  bank_account_id: string;
  status: 'parsing' | 'review' | 'approved' | 'failed';
  txn_count: number;
  total_debits: number;
  period_from: string | null;
  period_to: string | null;
  created_at: string;
  error_message: string | null;
}

export interface StatementTransaction {
  id: string;
  import_id: string;
  bank_account_id: string;
  txn_date: string;
  narration: string;
  ref_no: string | null;
  amount: number;
  suggested_category_id: string | null;
  suggested_payment_method_id: string | null;
  suggested_vendor: string | null;
  confidence: number | null;
  status: 'pending' | 'approved' | 'skipped';
  expense_id: string | null;
}

export const usePendingImports = () => {
  return useQuery({
    queryKey: ['statement-imports', 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('statement_imports')
        .select('*')
        .eq('status', 'review')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as StatementImport[];
    },
  });
};

export const useStatementImport = (id: string | undefined) => {
  return useQuery({
    enabled: !!id,
    queryKey: ['statement-imports', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('statement_imports')
        .select('*, bank_accounts(name, bank_name, last4)')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
};

export const useStatementTransactions = (importId: string | undefined) => {
  return useQuery({
    enabled: !!importId,
    queryKey: ['statement-transactions', importId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('statement_transactions')
        .select('*')
        .eq('import_id', importId!)
        .order('txn_date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as StatementTransaction[];
    },
  });
};

export const useUploadStatement = () => {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ file, bankAccountId }: { file: File; bankAccountId: string }) => {
      const path = `${bankAccountId}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from('bank-statements').upload(path, file);
      if (upErr) throw upErr;

      const { data, error } = await supabase.functions.invoke('parse-statement', {
        body: { file_path: path, bank_account_id: bankAccountId },
      });
      if (error) throw error;
      return data as { import_id: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['statement-imports'] });
      toast({ title: 'Statement parsed', description: 'Review transactions to approve.' });
    },
    onError: (e: any) => toast({ title: 'Upload failed', description: e.message, variant: 'destructive' }),
  });
};

export const useApproveImport = () => {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: {
      import_id: string;
      decisions: Array<{
        txn_id: string;
        action: 'approved' | 'skipped';
        category_id?: string | null;
        payment_method_id?: string | null;
        vendor_name?: string | null;
      }>;
    }) => {
      const { data, error } = await supabase.functions.invoke('approve-statement-import', { body: payload });
      if (error) throw error;
      return data as { inserted: number };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['statement-imports'] });
      qc.invalidateQueries({ queryKey: ['statement-transactions'] });
      qc.invalidateQueries({ queryKey: ['expenses'] });
      toast({ title: `${data?.inserted ?? 0} expenses added` });
    },
    onError: (e: any) => toast({ title: 'Approval failed', description: e.message, variant: 'destructive' }),
  });
};
