import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type StatementImportStatus =
  | 'parsing'
  | 'uploaded'
  | 'extracted'
  | 'categorized'
  | 'review'
  | 'approved'
  | 'failed'
  | 'failed_uploaded'
  | 'failed_extracted'
  | 'failed_categorized';

export interface StatementImport {
  id: string;
  bank_account_id: string;
  file_url: string | null;
  status: StatementImportStatus;
  txn_count: number;
  total_debits: number;
  period_from: string | null;
  period_to: string | null;
  created_at: string;
  error_message: string | null;
  bank_accounts?: {
    name?: string | null;
    bank_name?: string | null;
    last4?: string | null;
  } | null;
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

const ACTIVE_IMPORT_STATUSES: StatementImportStatus[] = [
  'parsing',
  'uploaded',
  'extracted',
  'categorized',
  'review',
  'failed',
  'failed_uploaded',
  'failed_extracted',
  'failed_categorized',
];

const shouldPollImport = (status?: StatementImportStatus | null) =>
  !!status && !['review', 'approved', 'failed', 'failed_uploaded', 'failed_extracted', 'failed_categorized'].includes(status);

export const usePendingImports = () => {
  return useQuery({
    queryKey: ['statement-imports', 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('statement_imports')
        .select('*, bank_accounts(name, bank_name, last4)')
        .in('status', ACTIVE_IMPORT_STATUSES)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as StatementImport[];
    },
    refetchInterval: (query) => {
      const imports = (query.state.data as StatementImport[] | undefined) ?? [];
      return imports.some((item) => shouldPollImport(item.status)) ? 2500 : false;
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
      return (data ?? null) as StatementImport | null;
    },
    refetchInterval: (query) => {
      const item = query.state.data as StatementImport | null | undefined;
      return shouldPollImport(item?.status) ? 2000 : false;
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
    refetchInterval: 2500,
  });
};

export const useUploadStatement = () => {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ file, bankAccountId }: { file: File; bankAccountId: string }) => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error('Please sign in again and retry the upload.');

      const path = `${authData.user.id}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage.from('bank-statements').upload(path, file, {
        contentType: 'application/pdf',
        upsert: false,
      });
      if (uploadError) throw new Error(uploadError.message);

      const { data: createdImport, error: importError } = await supabase
        .from('statement_imports')
        .insert({
          bank_account_id: bankAccountId,
          file_url: path,
          status: 'uploaded',
          uploaded_by: authData.user.id,
          error_message: null,
        })
        .select('id')
        .single();

      if (importError || !createdImport) {
        await supabase.storage.from('bank-statements').remove([path]);
        throw new Error(importError?.message || 'Could not create the statement import.');
      }

      supabase.functions
        .invoke('parse-statement', { body: { import_id: createdImport.id } })
        .then(async ({ error }) => {
          if (error) {
            await supabase
              .from('statement_imports')
              .update({
                status: 'failed_uploaded',
                error_message: error.message?.slice(0, 500) || 'Could not start statement parsing.',
              })
              .eq('id', createdImport.id);
          }
        })
        .finally(() => {
          qc.invalidateQueries({ queryKey: ['statement-imports'] });
          qc.invalidateQueries({ queryKey: ['statement-imports', createdImport.id] });
          qc.invalidateQueries({ queryKey: ['statement-transactions', createdImport.id] });
        });

      return { import_id: createdImport.id };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['statement-imports'] });
      toast({ title: 'Statement uploaded', description: 'Parsing started. You can track each step on the review screen.' });
    },
    onError: (e: any) => toast({ title: 'Upload failed', description: e.message, variant: 'destructive' }),
  });
};

export const useDeleteStatementImport = () => {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, fileUrl }: { id: string; fileUrl?: string | null }) => {
      const { error } = await supabase.from('statement_imports').delete().eq('id', id);
      if (error) throw error;

      if (fileUrl) {
        const { error: storageError } = await supabase.storage.from('bank-statements').remove([fileUrl]);
        if (storageError) {
          console.warn('Statement file cleanup failed:', storageError.message);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['statement-imports'] });
      qc.invalidateQueries({ queryKey: ['statement-transactions'] });
      toast({ title: 'Statement import removed' });
    },
    onError: (e: any) => toast({ title: 'Could not remove statement import', description: e.message, variant: 'destructive' }),
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
        action: 'approve' | 'skip';
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
