import React from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import type { StatementImportStatus } from '@/hooks/useStatementImports';

const STEPS = [
  { key: 'uploaded', label: 'Uploaded', detail: 'PDF saved to secure storage' },
  { key: 'extracted', label: 'Extracted', detail: 'Reading rows and columns from the PDF' },
  { key: 'categorized', label: 'AI categorized', detail: 'Suggesting categories, vendors and payment methods' },
  { key: 'review', label: 'Ready for review', detail: 'Open the import to approve transactions' },
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
  const isComplete = status === 'review' || status === 'approved';
  const stepInfo = STEPS[Math.min(currentStep, STEPS.length - 1)];

  // Progress: each step is a quarter; while running show partial fill of current step.
  const stepFraction = isComplete ? 1 : isFailed ? 0.5 : 0.6;
  const pct = isComplete
    ? 100
    : Math.min(100, Math.round(((currentStep + stepFraction) / STEPS.length) * 100));

  return (
    <div className={cn('space-y-2', compact && 'space-y-1.5')}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {isFailed ? (
            <XCircle className="h-4 w-4 text-destructive shrink-0" />
          ) : isComplete ? (
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
          )}
          <p className={cn('text-sm font-medium truncate', isFailed && 'text-destructive')}>
            Step {Math.min(currentStep + 1, STEPS.length)} of {STEPS.length} · {stepInfo.label}
          </p>
        </div>
        <span className="text-xs text-muted-foreground shrink-0 tabular-nums">{pct}%</span>
      </div>

      <Progress value={pct} className={cn('h-2', isFailed && '[&>div]:bg-destructive')} />

      {!compact && (
        <p className={cn('text-xs', isFailed ? 'text-destructive' : 'text-muted-foreground')}>
          {isFailed
            ? `${FAILURE_COPY[status!] || 'Import failed'}${errorMessage ? ` · ${errorMessage}` : ''}`
            : stepInfo.detail}
        </p>
      )}

      {compact && isFailed && (
        <p className="text-xs text-destructive">
          {FAILURE_COPY[status!] || 'Import failed'}{errorMessage ? ` · ${errorMessage}` : ''}
        </p>
      )}
    </div>
  );
};
