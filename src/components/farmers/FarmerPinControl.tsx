import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { KeyRound, Lock, Loader2, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUserPermissions } from '@/hooks/useUserPermissions';

/**
 * The counter's half of the PIN system: clear one, never set one.
 *
 * An operator who could set a PIN could sign in as the farmer and read their
 * earnings. Clearing only takes the door off its hinges -- the farmer scans
 * their slip and picks a new PIN that nobody else ever learns. Every clear is
 * recorded against the staff member who did it.
 */
export const FarmerPinControl: React.FC<{ farmerId: string; farmerName?: string }> = ({
  farmerId,
  farmerName,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin } = useUserPermissions();

  // Unlike clearing a PIN, which the farmer simply redoes, this voids every
  // slip they are holding. Admin only.
  const regenerate = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('fn_regenerate_portal_token', {
        p_farmer_id: farmerId,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farmer-lookup-list'] });
      toast({
        title: 'QR reset',
        description: 'Every slip already issued to this farmer has stopped working.',
      });
    },
    onError: (e: any) =>
      toast({ title: 'Could not reset the QR', description: e.message, variant: 'destructive' }),
  });

  const { data: status, isLoading } = useQuery({
    queryKey: ['farmer-pin-status', farmerId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('fn_farmer_pin_status', { p_farmer_id: farmerId });
      if (error) throw error;
      return (Array.isArray(data) ? data[0] : data) as {
        is_set: boolean;
        is_locked: boolean;
        locked_until: string | null;
        failed_attempts: number;
      } | undefined;
    },
  });

  const clear = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('fn_clear_farmer_pin', { p_farmer_id: farmerId });
      if (error) throw error;
      return data as boolean;
    },
    onSuccess: (removed) => {
      queryClient.invalidateQueries({ queryKey: ['farmer-pin-status', farmerId] });
      toast({
        title: removed ? 'PIN cleared' : 'No PIN was set',
        description: removed
          ? 'The farmer can scan the QR on any slip and choose a new one.'
          : undefined,
      });
    },
    onError: (e: any) =>
      toast({ title: 'Could not clear the PIN', description: e.message, variant: 'destructive' }),
  });

  if (isLoading) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }

  const resetQr = isAdmin ? (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-xs" disabled={regenerate.isPending}>
          {regenerate.isPending ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <QrCode className="mr-1 h-3 w-3" />
          )}
          Reset QR
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset the QR for {farmerName ?? 'this farmer'}?</AlertDialogTitle>
          <AlertDialogDescription>
            Every slip this farmer is holding stops opening their account, including old ones.
            Only do this if a slip has gone missing. Their next printed slip carries the new code.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => regenerate.mutate()}>Reset QR</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ) : null;

  if (!status?.is_set) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">
          No PIN set — this farmer signs in with the QR on their slip.
        </span>
        {resetQr}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="outline" className="gap-1">
        <KeyRound className="h-3 w-3" /> PIN set
      </Badge>

      {status.is_locked && (
        <Badge variant="destructive" className="gap-1">
          <Lock className="h-3 w-3" /> Locked out
        </Badge>
      )}

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm" variant="outline" disabled={clear.isPending}>
            {clear.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            Clear PIN
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear the PIN for {farmerName ?? 'this farmer'}?</AlertDialogTitle>
            <AlertDialogDescription>
              Their current PIN stops working immediately. They can scan the QR on any of their
              slips and choose a new one — you cannot set it for them. This is recorded against
              your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => clear.mutate()}>Clear PIN</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {resetQr}
    </div>
  );
};
