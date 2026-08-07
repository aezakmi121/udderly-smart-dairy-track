import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Undo2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { undoRemainingMs, formatCountdown } from '@/lib/collectionGuards';

const STORAGE_KEY = 'milk_collection_last_entry';

export interface UndoableEntry {
  id: string;
  createdAt: string;
  farmerName: string;
  farmerCode: string;
  quantity: number;
}

export const rememberEntry = (entry: UndoableEntry): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // A browser refusing storage costs the undo bar, not the collection.
  }
};

export const forgetEntry = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
};

const readEntry = (): UndoableEntry | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.id && parsed?.createdAt ? (parsed as UndoableEntry) : null;
  } catch {
    return null;
  }
};

/**
 * Take back the entry just made, for as long as the database will allow it.
 *
 * Wrong member code is noticed within seconds -- the farmer is still at the
 * counter and the slip has their neighbour's name on it. Until now the operator
 * had no remedy at all: the collection centre holds no DELETE, so it meant
 * finding an admin, which in practice meant the entry stayed wrong.
 *
 * Kept in storage rather than component state so that a refresh, or the tab
 * being closed between farmers, does not quietly remove the option.
 */
export const UndoLastEntry: React.FC<{ onUndone?: () => void }> = ({ onUndone }) => {
  const [entry, setEntry] = useState<UndoableEntry | null>(readEntry);
  const [remaining, setRemaining] = useState(() => undoRemainingMs(readEntry()?.createdAt));
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  // Re-read on mount and whenever another part of the app saves one.
  useEffect(() => {
    const sync = () => {
      const next = readEntry();
      setEntry(next);
      setRemaining(undoRemainingMs(next?.createdAt));
    };
    window.addEventListener('storage', sync);
    window.addEventListener('milk-collection-saved', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('milk-collection-saved', sync);
    };
  }, []);

  useEffect(() => {
    if (!entry) return;
    const tick = () => {
      const left = undoRemainingMs(entry.createdAt);
      setRemaining(left);
      if (left <= 0) {
        forgetEntry();
        setEntry(null);
      }
    };
    const id = setInterval(tick, 1000);
    tick();
    return () => clearInterval(id);
  }, [entry]);

  if (!entry || remaining <= 0) return null;

  const undo = async () => {
    setBusy(true);
    try {
      const { error, count } = await supabase
        .from('milk_collections')
        .delete({ count: 'exact' })
        .eq('id', entry.id);
      if (error) throw error;
      // The policy filters rather than refuses, so a blocked delete removes
      // nothing and reports no error. Saying "undone" then would be a lie.
      if (!count) {
        throw new Error('This entry can no longer be undone here. Ask an admin to remove it.');
      }
      forgetEntry();
      setEntry(null);
      toast({ title: 'Entry removed', description: `${entry.farmerCode} · ${entry.farmerName}` });
      onUndone?.();
    } catch (e: any) {
      toast({ title: 'Could not undo', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2">
      <div className="min-w-0 text-sm">
        <span className="font-medium">Just recorded:</span> {entry.farmerCode} · {entry.farmerName} ·{' '}
        {Number(entry.quantity).toFixed(2)} L
        <span className="ml-2 text-xs text-muted-foreground tabular-nums">
          undo for {formatCountdown(remaining)}
        </span>
      </div>
      <Button size="sm" variant="outline" onClick={undo} disabled={busy}>
        {busy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Undo2 className="mr-1 h-3 w-3" />}
        Undo
      </Button>
    </div>
  );
};
