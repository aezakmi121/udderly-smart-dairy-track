import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Loader2, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

/**
 * Taking a farmer's mobile number at the counter.
 *
 * Goes through fn_set_farmer_phone rather than a direct update: the collection
 * centre can read farmers but not write them, and row security cannot be
 * narrowed to a single column. The function touches the number and nothing
 * else, so an operator taking a phone number cannot also rename a farmer.
 */
export const FarmerPhoneControl: React.FC<{
  farmerId: string;
  phoneNumber?: string | null;
  onChanged?: () => void;
}> = ({ farmerId, phoneNumber, onChanged }) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(phoneNumber ?? '').replace(/\D/g, '').slice(-10));
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: async (phone: string) => {
      const { data, error } = await supabase.rpc('fn_set_farmer_phone', {
        p_farmer_id: farmerId,
        p_phone: phone,
      });
      if (error) throw error;
      return data as string | null;
    },
    onSuccess: (saved) => {
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ['farmer-lookup-list'] });
      queryClient.invalidateQueries({ queryKey: ['farmers'] });
      toast({ title: saved ? 'Mobile number saved' : 'Mobile number cleared' });
      onChanged?.();
    },
    onError: (e: any) =>
      // The function names the clashing farmer, which is what the operator
      // needs in order to fix whichever record is wrong.
      toast({ title: 'Could not save the number', description: e.message, variant: 'destructive' }),
  });

  const current = String(phoneNumber ?? '').replace(/\D/g, '').slice(-10);

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Smartphone className="h-4 w-4 text-muted-foreground" />
        {current ? (
          <span className="text-sm tabular-nums">{current}</span>
        ) : (
          <Badge variant="outline" className="text-amber-700">
            No mobile number — cannot use a PIN
          </Badge>
        )}
        <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
          {current ? 'Change' : 'Add number'}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex h-9 items-center rounded bg-muted px-2 text-sm">+91</span>
      <Input
        className="h-9 w-40 tabular-nums"
        inputMode="numeric"
        maxLength={10}
        placeholder="98xxxxxxxx"
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
        aria-label="Mobile number"
        autoFocus
      />
      <Button size="sm" onClick={() => save.mutate(value)} disabled={save.isPending}>
        {save.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          setEditing(false);
          setValue(current);
        }}
      >
        <X className="h-3 w-3" />
      </Button>
      {/* Clearing is a legitimate correction when a wrong number was taken. */}
      {current && (
        <Button size="sm" variant="ghost" className="text-xs" onClick={() => save.mutate('')}>
          Clear
        </Button>
      )}
    </div>
  );
};
