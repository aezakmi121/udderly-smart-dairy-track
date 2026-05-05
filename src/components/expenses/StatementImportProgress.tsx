import React from 'react';
import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StatementImportStatus } from '@/hooks/useStatementImports';

const STEPS = [
  { key: 'uploaded', label: 'Uploaded' },
  { key: 'extracted', label: 'Extracted' },
  { key: 'categorized', label: 'AI categorized' },
  { key: 'review', label: 'Ready for review' },
] as const;

const STATUS_ORDER: Record<string, number> = {
  uploaded: 0,
  parsing: 1,
  extracted: 1,
  categorized: 2,
  review: 3,
  approved: 3,
};

const FAILURE_COPY: Partial<Record<StatementImportStatus, string>> = {
  failed_uploaded: 'Upload step failed',
  failed_extracted: 'Extraction step failed',
  failed_categorized: 'AI categorization failed',
  failed: 'Import failed',
};

export const getStatementImportStepIndex = (status?: StatementImportStatus | null) => {
  if (!status) return 0;
  if (status in STATUS_ORDER) return STATUS_ORDER[status];
  if (status.startsWith('failed_')) {
    const failedStep = status.replace('failed_', '');
    const idx = STEPS.findIndex((step) => step.key === failedStep);
    return idx >= 0 ? idx : 0;
  }
  return 0;
};

export const StatementImportProgress: React.FC<{
  status?: StatementImportStatus | null;
  errorMessage?: string | null;
  compact?: boolean;
}> = ({ status, errorMessage, compact = false }) => {
  const currentStep = getStatementImportStepIndex(status);
  const isFailed = !!status && status.startsWith('failed');
  const isParsing = status === 'parsing';

  return (
    <div className="space-y-2">
      <div className={cn('grid gap-2', compact ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-4')}>
        {STEPS.map((step, index) => {
          const isDone = !isFailed && index < currentStep;
          const isCurrent = index === currentStep;
          const failedAtStep = isFailed && isCurrent;

          return (
            <div
              key={step.key}
              className={cn(
                'flex items-center gap-2 rounded-md border px-3 py-2',
                isDone && 'border-primary/40 bg-primary/5',
                isCurrent && !failedAtStep && 'border-primary/50 bg-muted/40',
                failedAtStep && 'border-destructive/40 bg-destructive/5'
              )}
            >
              {failedAtStep ? (
                <XCircle className="h-4 w-4 text-destructive" />
              ) : isDone ? (
                <CheckCircle2 className="h-4 w-4 text-primary" />
              ) : isCurrent && isParsing ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-xs font-medium">{step.label}</span>
            </div>
          );
        })}
      </div>

      {isFailed && (
        <p className="text-xs text-destructive">
          {FAILURE_COPY[status] || 'Import failed'}{errorMessage ? ` · ${errorMessage}` : ''}
        </p>
      )}
    </div>
  );
};
