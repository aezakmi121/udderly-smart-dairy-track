import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Check, X, Loader2, Trash2 } from 'lucide-react';
import {
  useStatementImport,
  useStatementTransactions,
  useApproveImport,
  useDeleteStatementImport,
  type StatementTransaction,
} from '@/hooks/useStatementImports';
import { useExpenseManagement } from '@/hooks/useExpenseManagement';
import { format } from 'date-fns';
import { MobileOptimizedLayout } from '@/components/mobile/MobileOptimizedLayout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { StatementImportProgress } from './StatementImportProgress';

type RowEdit = {
  category_id?: string | null;
  payment_method_id?: string | null;
  vendor_name?: string | null;
  payment_period?: string | null; // YYYY-MM
};

export const StatementReviewScreen = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: imp } = useStatementImport(id);
  const { data: txns = [], isLoading } = useStatementTransactions(id);
  const { useCategories, usePaymentMethods } = useExpenseManagement();
  const { data: categories = [] } = useCategories();
  const { data: paymentMethods = [] } = usePaymentMethods();
  const approve = useApproveImport();
  const removeImport = useDeleteStatementImport();

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [edits, setEdits] = useState<Record<string, RowEdit>>({});
  const [confidenceFilter, setConfidenceFilter] = useState<'all' | 'high' | 'low'>('all');
  const [bulkPeriod, setBulkPeriod] = useState<string>(''); // YYYY-MM

  const filtered = useMemo(() => {
    if (confidenceFilter === 'all') return txns;
    return txns.filter((t) => {
      const c = t.confidence ?? 0;
      return confidenceFilter === 'high' ? c >= 0.85 : c < 0.85;
    });
  }, [txns, confidenceFilter]);

  const pendingTxns = txns.filter((t) => t.status === 'pending');

  const selectAllHigh = () => {
    const next: Record<string, boolean> = {};
    pendingTxns.forEach((t) => {
      if ((t.confidence ?? 0) >= 0.85) next[t.id] = true;
    });
    setSelected(next);
  };

  const toggle = (id: string) => setSelected((s) => ({ ...s, [id]: !s[id] }));

  const updateEdit = (id: string, patch: Partial<RowEdit>) =>
    setEdits((e) => ({ ...e, [id]: { ...e[id], ...patch } }));

  const txnPeriodMonth = (t: StatementTransaction) =>
    (t.payment_period ? t.payment_period.slice(0, 7) : t.txn_date.slice(0, 7));

  const getEffective = (t: StatementTransaction): RowEdit => ({
    category_id: edits[t.id]?.category_id ?? t.suggested_category_id,
    payment_method_id: edits[t.id]?.payment_method_id ?? t.suggested_payment_method_id,
    vendor_name: edits[t.id]?.vendor_name ?? t.suggested_vendor,
    payment_period: edits[t.id]?.payment_period ?? txnPeriodMonth(t),
  });

  const selectedIds = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);

  const applyBulkPeriod = () => {
    if (!bulkPeriod || !selectedIds.length) return;
    setEdits((prev) => {
      const next = { ...prev };
      selectedIds.forEach((tid) => {
        next[tid] = { ...next[tid], payment_period: bulkPeriod };
      });
      return next;
    });
  };

  const handleApproveSelected = async () => {
    if (!id || !selectedIds.length) return;
    const decisions = selectedIds.map((txn_id) => {
      const t = txns.find((x) => x.id === txn_id)!;
      const eff = getEffective(t);
      const period = eff.payment_period
        ? (eff.payment_period.length === 7 ? `${eff.payment_period}-01` : eff.payment_period)
        : null;
      return {
        txn_id,
        action: 'approve' as const,
        category_id: eff.category_id,
        payment_method_id: eff.payment_method_id,
        vendor_name: eff.vendor_name,
        payment_period: period,
      };
    });
    const res = await approve.mutateAsync({ import_id: id, decisions });
    setSelected({});
    if (res?.inserted !== undefined) navigate('/expenses');
  };

  const handleSkip = async (txn_id: string) => {
    if (!id) return;
    await approve.mutateAsync({
      import_id: id,
      decisions: [{ txn_id, action: 'skip' }],
    });
  };

  const conf = (c: number | null) => {
    const v = c ?? 0;
    const variant = v >= 0.85 ? 'default' : v >= 0.6 ? 'secondary' : 'destructive';
    return <Badge variant={variant as any}>{Math.round(v * 100)}%</Badge>;
  };

  return (
    <MobileOptimizedLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/expenses')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Review Statement Import</h1>
            {imp && (
              <p className="text-xs text-muted-foreground">
                {imp.bank_accounts?.name} · {imp.bank_accounts?.bank_name}
                {imp.bank_accounts?.last4 ? ` ••${imp.bank_accounts.last4}` : ''}
                {imp.period_from && imp.period_to ? ` · ${imp.period_from} → ${imp.period_to}` : ''}
              </p>
            )}
          </div>
        </div>

        {imp && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Import progress</p>
                  <p className="text-xs text-muted-foreground">
                    This shows exactly where the PDF import is currently stuck.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (!imp) return;
                    await removeImport.mutateAsync({ id: imp.id, fileUrl: imp.file_url });
                    navigate('/expenses');
                  }}
                  disabled={removeImport.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove Import
                </Button>
              </div>

              <StatementImportProgress status={imp.status} errorMessage={imp.error_message} />

              {imp.status !== 'review' && imp.status !== 'approved' && (
                <Alert>
                  <AlertDescription>
                    {imp.status.startsWith('failed')
                      ? 'This import stopped before review. You can remove it and upload the PDF again.'
                      : 'Parsing is still running. This page refreshes automatically while the import moves through each step.'}
                  </AlertDescription>
                </Alert>
              )}

              {imp.status === 'review' && txns.length === 0 && (
                <Alert>
                  <AlertDescription>
                    This import reached review, but no saved transactions were found. Remove it and re-upload the PDF.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {imp && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Total Txns</p><p className="text-lg font-semibold">{imp.txn_count}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Pending</p><p className="text-lg font-semibold">{pendingTxns.length}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Total Debits</p><p className="text-lg font-semibold">₹{Number(imp.total_debits).toLocaleString('en-IN')}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Selected</p><p className="text-lg font-semibold">{selectedIds.length}</p></CardContent></Card>
          </div>
        )}

        <Card>
          <CardHeader className="pb-3 flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Transactions</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={confidenceFilter} onValueChange={(v) => setConfidenceFilter(v as any)}>
                <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All confidence</SelectItem>
                  <SelectItem value="high">High (≥85%)</SelectItem>
                  <SelectItem value="low">Low (&lt;85%)</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                <Input
                  type="month"
                  value={bulkPeriod}
                  onChange={(e) => setBulkPeriod(e.target.value)}
                  className="h-8 text-xs w-[140px]"
                  title="Accrual month to apply to selected rows"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={applyBulkPeriod}
                  disabled={!bulkPeriod || !selectedIds.length}
                >
                  Apply period
                </Button>
              </div>
              <Button size="sm" variant="outline" onClick={selectAllHigh}>Select all ≥85%</Button>
              <Button
                size="sm"
                onClick={handleApproveSelected}
                disabled={!selectedIds.length || approve.isPending || imp?.status !== 'review'}
              >
                {approve.isPending ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Check className="h-3 w-3 mr-2" />}
                Approve Selected ({selectedIds.length})
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs">
                  <tr>
                    <th className="p-2 text-left w-8"></th>
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-left">Narration</th>
                    <th className="p-2 text-right">Amount</th>
                    <th className="p-2 text-left">Period</th>
                    <th className="p-2 text-left">Category</th>
                    <th className="p-2 text-left">Payment</th>
                    <th className="p-2 text-left">Vendor</th>
                    <th className="p-2 text-center">Conf.</th>
                    <th className="p-2 text-center">Status</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr><td colSpan={11} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
                  )}
                  {!isLoading && filtered.length === 0 && (
                    <tr><td colSpan={11} className="p-6 text-center text-muted-foreground">No transactions.</td></tr>
                  )}
                  {filtered.map((t) => {
                    const eff = getEffective(t);
                    const isPending = t.status === 'pending';
                    return (
                      <tr key={t.id} className="border-t">
                        <td className="p-2">
                          {isPending && (
                            <Checkbox
                              checked={!!selected[t.id]}
                              onCheckedChange={() => toggle(t.id)}
                            />
                          )}
                        </td>
                        <td className="p-2 whitespace-nowrap">{format(new Date(t.txn_date), 'dd MMM')}</td>
                        <td className="p-2 max-w-[260px] truncate" title={t.narration}>{t.narration}</td>
                        <td className="p-2 text-right font-medium">₹{Number(t.amount).toLocaleString('en-IN')}</td>
                        <td className="p-2">
                          <Input
                            type="month"
                            className="h-8 text-xs w-[130px]"
                            value={(eff.payment_period ?? '').slice(0, 7)}
                            onChange={(e) => updateEdit(t.id, { payment_period: e.target.value })}
                            disabled={!isPending}
                          />
                        </td>
                        <td className="p-2">
                          <Select
                            value={eff.category_id ?? ''}
                            onValueChange={(v) => updateEdit(t.id, { category_id: v })}
                            disabled={!isPending}
                          >
                            <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue placeholder="—" /></SelectTrigger>
                            <SelectContent>
                              {categories.map((c: any) => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2">
                          <Select
                            value={eff.payment_method_id ?? ''}
                            onValueChange={(v) => updateEdit(t.id, { payment_method_id: v })}
                            disabled={!isPending}
                          >
                            <SelectTrigger className="h-8 text-xs w-[120px]"><SelectValue placeholder="—" /></SelectTrigger>
                            <SelectContent>
                              {paymentMethods.map((p: any) => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2">
                          <Input
                            className="h-8 text-xs w-[140px]"
                            value={eff.vendor_name ?? ''}
                            onChange={(e) => updateEdit(t.id, { vendor_name: e.target.value })}
                            disabled={!isPending}
                          />
                        </td>
                        <td className="p-2 text-center">{conf(t.confidence)}</td>
                        <td className="p-2 text-center">
                          <Badge variant={t.status === 'approved' ? 'default' : t.status === 'skipped' ? 'secondary' : 'outline'}>
                            {t.status}
                          </Badge>
                        </td>
                        <td className="p-2">
                          {isPending && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSkip(t.id)}
                              disabled={approve.isPending}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MobileOptimizedLayout>
  );
};

export default StatementReviewScreen;
