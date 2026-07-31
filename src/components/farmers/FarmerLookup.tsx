import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Presets rather than a calendar: quicker to hit on a phone at a counter, and
// they match how farmers actually ask -- this cycle, last cycle, this month.
type RangeKey = 'cycle' | 'last7' | 'month' | 'last30';

const RANGES: Array<{ key: RangeKey; label: string; hindi: string; days: number }> = [
  { key: 'last7', label: 'Last 7 days', hindi: 'पिछले 7 दिन', days: 7 },
  { key: 'cycle', label: 'Last 15 days', hindi: 'पिछले 15 दिन', days: 15 },
  { key: 'month', label: 'This month', hindi: 'इस महीने', days: 30 },
  { key: 'last30', label: 'Last 60 days', hindi: 'पिछले 60 दिन', days: 60 },
];

const inr = (n: number) => `₹${n.toFixed(2)}`;

/**
 * Read-only earnings lookup for the collection centre.
 *
 * More than half the farmers have no usable phone number, so somebody has to be
 * able to answer "how much have I made" at the counter. This shows exactly what
 * the farmer's own portal would, and nothing that can be edited.
 */
export const FarmerLookup: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [range, setRange] = useState<RangeKey>('cycle');

  const { data: farmers, isLoading: farmersLoading } = useQuery({
    queryKey: ['farmer-lookup-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('farmers')
        .select('id, name, farmer_code')
        .order('farmer_code');
      if (error) throw error;
      return data ?? [];
    },
  });

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return (farmers ?? [])
      .filter(
        (f: any) =>
          String(f.farmer_code ?? '').toLowerCase().includes(q) ||
          String(f.name ?? '').toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [farmers, search]);

  const selected = (farmers ?? []).find((f: any) => f.id === selectedId) as any;
  const days = RANGES.find((r) => r.key === range)!.days;

  const { data: summary, isLoading } = useQuery({
    queryKey: ['farmer-lookup', selectedId, range],
    enabled: !!selectedId,
    queryFn: async () => {
      const from = new Date();
      from.setDate(from.getDate() - days);
      const fromDate = from.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('milk_collections')
        .select('collection_date, session, quantity, fat_percentage, snf_percentage, rate_per_liter, total_amount, species')
        .eq('farmer_id', selectedId)
        .gte('collection_date', fromDate)
        .order('collection_date', { ascending: false })
        .order('session', { ascending: false });
      if (error) throw error;

      const rows = data ?? [];
      return {
        rows,
        litres: rows.reduce((s: number, r: any) => s + Number(r.quantity || 0), 0),
        amount: rows.reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0),
        from: fromDate,
      };
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Farmer Lookup</h1>
        <p className="text-muted-foreground">
          Look up what a farmer has earned. Read-only — nothing here changes a collection.
        </p>
      </div>

      <Card>
        <CardContent className="pt-4 space-y-3">
          <div>
            <Label htmlFor="farmer-search">Farmer code or name</Label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="farmer-search"
                className="pl-8"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelectedId(null);
                }}
                placeholder="1234 or Ramesh"
                autoComplete="off"
              />
            </div>
          </div>

          {farmersLoading && <p className="text-sm text-muted-foreground">Loading farmers…</p>}

          {!selectedId && matches.length > 0 && (
            <div className="space-y-1">
              {matches.map((f: any) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(f.id);
                    setSearch(`${f.farmer_code} — ${f.name}`);
                  }}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-muted flex items-center gap-3"
                >
                  <Badge variant="outline">{f.farmer_code}</Badge>
                  <span>{f.name}</span>
                </button>
              ))}
            </div>
          )}

          {!selectedId && search.trim() && matches.length === 0 && !farmersLoading && (
            <p className="text-sm text-muted-foreground">No farmer matches that.</p>
          )}
        </CardContent>
      </Card>

      {selectedId && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {RANGES.map((r) => (
              <Button
                key={r.key}
                type="button"
                size="sm"
                variant={range === r.key ? 'default' : 'outline'}
                onClick={() => setRange(r.key)}
                className="flex-col h-auto py-2"
              >
                <span>{r.hindi}</span>
                <span className="text-[10px] opacity-70">{r.label}</span>
              </Button>
            ))}
          </div>

          <Card className="bg-primary text-primary-foreground">
            <CardContent className="p-4">
              <div className="text-sm opacity-90">
                {selected?.name} · {selected?.farmer_code}
              </div>
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin mt-2" />
              ) : (
                <>
                  <div className="text-3xl font-bold mt-1">{inr(summary?.amount ?? 0)}</div>
                  <div className="text-xs opacity-80 mt-1">
                    {(summary?.litres ?? 0).toFixed(1)} लीटर · {summary?.rows.length ?? 0} बार · from{' '}
                    {summary?.from}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Every collection</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : summary && summary.rows.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b">
                        <th className="py-2 pr-3">Date</th>
                        <th className="py-2 pr-3">Qty</th>
                        {/* The numbers farmers repeat to each other. */}
                        <th className="py-2 pr-3">Fat</th>
                        <th className="py-2 pr-3">SNF</th>
                        <th className="py-2 pr-3">Rate</th>
                        <th className="py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.rows.map((r: any, i: number) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-2 pr-3 whitespace-nowrap">
                            {r.collection_date}
                            <span className="text-muted-foreground ml-1">
                              {r.session === 'morning' ? 'AM' : 'PM'}
                            </span>
                          </td>
                          <td className="py-2 pr-3">{Number(r.quantity).toFixed(2)}</td>
                          <td className="py-2 pr-3">{Number(r.fat_percentage).toFixed(1)}</td>
                          <td className="py-2 pr-3">{Number(r.snf_percentage).toFixed(1)}</td>
                          <td className="py-2 pr-3">{Number(r.rate_per_liter).toFixed(2)}</td>
                          <td className="py-2 text-right font-medium">
                            {inr(Number(r.total_amount))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No collections for this farmer in that period.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
