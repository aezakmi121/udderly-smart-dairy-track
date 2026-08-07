import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DayHero, DaySessions, DayList } from '@/components/farmer-view';
import { FarmerPinControl } from './FarmerPinControl';
import { groupByDay, pickLatestDay, type FarmerCollection } from '@/lib/farmerDays';
import { formatDateDMY, formatLitresShort, formatRupees } from '@/lib/farmerFormat';

// Presets rather than a calendar: quicker to hit on a phone at a counter, and
// they match how farmers actually ask -- this cycle, last cycle, this month.
type RangeKey = 'cycle' | 'last7' | 'month' | 'last30';

const RANGES: Array<{ key: RangeKey; label: string; hindi: string; days: number }> = [
  { key: 'last7', label: 'Last 7 days', hindi: 'पिछले 7 दिन', days: 7 },
  { key: 'cycle', label: 'Last 15 days', hindi: 'पिछले 15 दिन', days: 15 },
  { key: 'month', label: 'This month', hindi: 'इस महीने', days: 30 },
  { key: 'last30', label: 'Last 60 days', hindi: 'पिछले 60 दिन', days: 60 },
];

/**
 * Read-only earnings lookup for the collection centre.
 *
 * More than half the farmers have no usable phone number, so somebody has to be
 * able to answer "how much have I made" at the counter. Below the search this
 * shows the farmer's own screen, colours and all -- when the operator turns the
 * phone around, the two of them are pointing at the same card rather than
 * arguing over two differently shaped numbers.
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
        .select('id, collection_date, session, quantity, fat_percentage, snf_percentage, rate_per_liter, total_amount, species, is_accepted, remarks, created_at')
        .eq('farmer_id', selectedId)
        .gte('collection_date', fromDate)
        .order('collection_date', { ascending: false });
      if (error) throw error;

      const grouped = groupByDay((data ?? []) as unknown as FarmerCollection[]);
      return {
        grouped,
        litres: grouped.reduce((s, d) => s + d.litres, 0),
        amount: grouped.reduce((s, d) => s + d.amount, 0),
        deliveries: grouped.reduce((s, d) => s + d.acceptedCount, 0),
        from: fromDate,
      };
    },
  });

  const latest = summary ? pickLatestDay(summary.grouped) : null;
  const older = summary
    ? latest
      ? summary.grouped.filter((d) => d.date !== latest.date)
      : summary.grouped
    : [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Farmer Lookup</h1>
        <p className="text-muted-foreground">
          Look up what a farmer has earned. Read-only — nothing here changes a collection.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-3 pt-4">
          <div>
            <Label htmlFor="farmer-search">Farmer code or name</Label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-muted"
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
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {RANGES.map((r) => (
              <Button
                key={r.key}
                type="button"
                size="sm"
                variant={range === r.key ? 'default' : 'outline'}
                onClick={() => setRange(r.key)}
                className="h-auto flex-col py-2"
              >
                <span>{r.hindi}</span>
                <span className="text-[10px] opacity-70">{r.label}</span>
              </Button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex justify-center p-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* The operator's own total for the chosen range, in the office
                  palette. Everything below it belongs to the farmer. */}
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">
                    {selected?.name} · {selected?.farmer_code} — since {formatDateDMY(summary?.from)}
                  </div>
                  <div className="mt-1 text-3xl font-bold tabular-nums">
                    {formatRupees(summary?.amount ?? 0)}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground tabular-nums">
                    {formatLitresShort(summary?.litres ?? 0)} लीटर · {summary?.deliveries ?? 0} बार
                  </div>
                  <div className="mt-3 border-t pt-3">
                    <FarmerPinControl farmerId={selectedId} farmerName={selected?.name} />
                  </div>
                </CardContent>
              </Card>

              <div className="farmer-theme space-y-4 rounded-2xl bg-background p-3 text-foreground">
                <p className="px-1 text-xs text-muted-foreground">
                  किसान को यही दिखता है · exactly what the farmer sees
                </p>
                <DayHero
                  day={latest}
                  farmerName={selected?.name}
                  farmerCode={selected?.farmer_code}
                />
                {latest && <DaySessions day={latest} />}
                <DayList days={older} emptyMessage="इस अवधि में और कोई हिसाब नहीं" />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};
