import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2 } from 'lucide-react';

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export const AdvancesTab: React.FC = () => {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: farmers = [] } = useQuery({
    queryKey: ['farmers-active'],
    queryFn: async () => {
      const { data, error } = await supabase.from('farmers').select('id, name, farmer_code').eq('is_active', true).order('farmer_code');
      if (error) throw error;
      return data;
    },
  });

  const { data: advances = [], isLoading } = useQuery({
    queryKey: ['advances'],
    queryFn: async () => {
      const { data, error } = await supabase.from('farmer_advances')
        .select('*, farmers(name, farmer_code)')
        .order('advance_date', { ascending: false }).limit(100);
      if (error) throw error;
      return data as any[];
    },
  });

  const [farmerId, setFarmerId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  const create = useMutation({
    mutationFn: async () => {
      if (!farmerId || !amount) throw new Error('Select farmer & amount');
      const { error } = await supabase.from('farmer_advances').insert({
        farmer_id: farmerId, amount: Number(amount), advance_date: date, notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Advance added' });
      setAmount(''); setNotes('');
      qc.invalidateQueries({ queryKey: ['advances'] });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="py-3"><CardTitle className="text-sm flex items-center gap-2"><Plus className="h-4 w-4" /> New advance</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <div className="sm:col-span-2">
            <Label className="text-xs">Farmer</Label>
            <select value={farmerId} onChange={(e) => setFarmerId(e.target.value)} className="w-full h-10 border rounded px-2 text-sm bg-background">
              <option value="">Select farmer…</option>
              {farmers.map((f: any) => <option key={f.id} value={f.id}>{f.farmer_code} · {f.name}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Amount ₹</Label>
            <Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} />
          </div>
          <div>
            <Label className="text-xs">Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="sm:col-span-4">
            <Label className="text-xs">Note</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="sm:col-span-4 flex justify-end">
            <Button onClick={() => create.mutate()} disabled={create.isPending}>
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Add advance
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-sm">Recent advances</CardTitle></CardHeader>
        <CardContent className="pt-0 space-y-2 max-h-[60vh] overflow-y-auto">
          {isLoading && <Loader2 className="animate-spin mx-auto" />}
          {advances.map((a) => {
            const remaining = Number(a.amount) - Number(a.recovered_amount ?? 0);
            return (
              <div key={a.id} className="border rounded p-2 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div>
                  <div className="font-medium">{a.farmers?.farmer_code} · {a.farmers?.name}</div>
                  <div className="text-muted-foreground">{a.advance_date} · {a.notes ?? ''}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{inr(Number(a.amount))}</span>
                  {a.status === 'outstanding' && remaining > 0 && <Badge className="bg-amber-100 text-amber-700">Due {inr(remaining)}</Badge>}
                  {a.status === 'recovered' && <Badge className="bg-green-100 text-green-700">Recovered</Badge>}
                  {a.status === 'written_off' && <Badge variant="secondary">Written off</Badge>}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};
