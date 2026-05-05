import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowRight } from 'lucide-react';
import { usePendingImports } from '@/hooks/useStatementImports';
import { Card, CardContent } from '@/components/ui/card';

export const PendingReviewsStrip = () => {
  const navigate = useNavigate();
  const { data: imports = [] } = usePendingImports();

  if (!imports.length) return null;

  const totalTxns = imports.reduce((s, i) => s + (i.txn_count || 0), 0);

  const handleClick = () => {
    if (imports.length === 1) navigate(`/expenses/import/${imports[0].id}`);
    else navigate(`/expenses/import/${imports[0].id}`);
  };

  return (
    <Card
      className="cursor-pointer hover:bg-muted/50 transition-colors border-primary/30 bg-primary/5"
      onClick={handleClick}
    >
      <CardContent className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium">
              {imports.length} statement {imports.length === 1 ? 'import' : 'imports'} awaiting review
            </p>
            <p className="text-xs text-muted-foreground">{totalTxns} transactions to approve</p>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </CardContent>
    </Card>
  );
};
