import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowRight, Trash2 } from 'lucide-react';
import { useDeleteStatementImport, usePendingImports } from '@/hooks/useStatementImports';
import { StatementImportProgress, getStatementImportStepIndex } from './StatementImportProgress';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const PendingReviewsStrip = () => {
  const navigate = useNavigate();
  const { data: imports = [] } = usePendingImports();
  const removeImport = useDeleteStatementImport();

  if (!imports.length) return null;

  const totalTxns = imports.reduce((s, i) => s + (i.txn_count || 0), 0);
  const sortedImports = [...imports].sort((a, b) => getStatementImportStepIndex(a.status) - getStatementImportStepIndex(b.status));
  const mostStuckImport = sortedImports[0];

  const handleClick = () => {
    navigate(`/expenses/import/${mostStuckImport.id}`);
  };

  return (
    <Card
      className="cursor-pointer hover:bg-muted/50 transition-colors border-primary/30 bg-primary/5"
      onClick={handleClick}
    >
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="h-5 w-5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {imports.length} statement {imports.length === 1 ? 'import' : 'imports'} in progress or awaiting review
              </p>
              <p className="text-xs text-muted-foreground">{totalTxns} transactions currently attached to active imports</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                removeImport.mutate({ id: mostStuckImport.id, fileUrl: mostStuckImport.file_url });
              }}
              disabled={removeImport.isPending}
              title="Remove this stuck import"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <StatementImportProgress
          status={mostStuckImport.status}
          errorMessage={mostStuckImport.error_message}
          compact
        />

        {sortedImports.length > 1 && (
          <div className="space-y-2 pt-1">
            {sortedImports.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-md border bg-background/70 px-3 py-2"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/expenses/import/${item.id}`);
                }}
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">
                    {item.bank_accounts?.name || 'Statement import'}
                    {item.bank_accounts?.bank_name ? ` · ${item.bank_accounts.bank_name}` : ''}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {item.txn_count} txns · {item.status.replace(/_/g, ' ')}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImport.mutate({ id: item.id, fileUrl: item.file_url });
                  }}
                  disabled={removeImport.isPending}
                  title="Remove this import"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
