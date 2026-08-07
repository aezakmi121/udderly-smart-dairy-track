// Hindi-first farmer portal -- read-only, mobile-first, today first.
import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogOut, Receipt, Wallet, CalendarDays, Download, KeyRound } from 'lucide-react';
import { DayHero, DaySessions, DayList } from '@/components/farmer-view';
import { PinLoginCard } from '@/components/farmer-view/PinLoginCard';
import { PinSetupCard } from '@/components/farmer-view/PinSetupCard';
import { PhoneCaptureCard } from '@/components/farmer-view/PhoneCaptureCard';
import { groupByDay, pickLatestDay } from '@/lib/farmerDays';
import { formatDateDMY, formatLitresShort, formatRupees, formatRupeesRounded } from '@/lib/farmerFormat';

const TOKEN_KEY = 'farmer_portal_token';

const FN_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function callFn(path: string, body?: any, token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
  };
  if (token) headers['x-farmer-token'] = token;
  const res = await fetch(`${FN_BASE}/${path}`, {
    method: body ? 'POST' : 'GET', headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    // Carry the whole payload, not just a message: the PIN screens need the
    // machine-readable code and the attempts remaining to say anything useful.
    const err = Object.assign(new Error(data.error ?? 'Request failed'), data);
    throw err;
  }
  return data;
}

export const FarmerPortal: React.FC = () => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const logout = () => { localStorage.removeItem(TOKEN_KEY); setToken(null); };

  return (
    // `farmer-theme` swaps the office app's slate palette for the dairy's own.
    <div className="farmer-theme min-h-screen bg-background pb-10 text-foreground">
      <header className="flex items-center justify-between bg-primary p-4 text-primary-foreground shadow">
        <div>
          <div className="text-lg font-bold">किसान पोर्टल</div>
          <div className="text-[11px] opacity-80">Farmer Portal</div>
        </div>
        {token && (
          <Button size="sm" variant="secondary" onClick={logout}>
            <LogOut className="mr-1 h-4 w-4" /> लॉगआउट
          </Button>
        )}
      </header>
      <main className="mx-auto max-w-md space-y-4 p-3">
        {!token ? (
          <PinLoginCard
            callFn={(path, body) => callFn(path, body)}
            onToken={(t) => { localStorage.setItem(TOKEN_KEY, t); setToken(t); }}
          />
        ) : (
          <PortalHome token={token} onUnauthorized={logout} />
        )}
      </main>
    </div>
  );
};

const PortalHome: React.FC<{ token: string; onUnauthorized: () => void }> = ({ token, onUnauthorized }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [pinPanel, setPinPanel] = useState<'hidden' | 'open'>('hidden');
  const [pinDismissed, setPinDismissed] = useState(false);
  const [phoneAdded, setPhoneAdded] = useState(false);
  const [phoneDismissed, setPhoneDismissed] = useState(false);

  useEffect(() => {
    callFn('farmer-portal-data', undefined, token)
      .then(setData)
      .catch((e) => {
        if (String(e.message).includes('unauthorized')) onUnauthorized();
        else setErr(e.message);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const days = useMemo(() => groupByDay(data?.daily ?? []), [data]);
  const latest = useMemo(() => pickLatestDay(days), [days]);
  const older = useMemo(
    () => (latest ? days.filter((d) => d.date !== latest.date) : days),
    [days, latest]
  );

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (err) return <Card><CardContent className="p-4 text-sm text-destructive">{err}</CardContent></Card>;
  if (!data) return null;

  const { farmer, cycle, liveTotal, bills, advances, pin } = data;
  // Only worth offering to farmers with a number on file -- the PIN is useless
  // without one to pair it with, and 32 of 61 have none.
  const offerPin = (pin?.canSet || phoneAdded) && !pin?.isSet && !pinDismissed;
  // Without a number a PIN has nothing to pair with, so ask for that first.
  const offerPhone = !pin?.canSet && !phoneAdded && !phoneDismissed;
  const lastPaid = bills?.find((b: any) => b.status === 'paid');
  const advanceDue = (advances ?? []).filter((a: any) => a.status === 'outstanding')
    .reduce((s: number, a: any) => s + (Number(a.amount) - Number(a.recovered_amount ?? 0)), 0);

  return (
    <div className="space-y-4">
      {/* Today, and nothing else, above the fold. */}
      <DayHero day={latest} farmerName={farmer?.name} farmerCode={farmer?.farmer_code} />
      {latest && <DaySessions day={latest} />}

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 px-1 text-sm font-semibold text-muted-foreground">
          <CalendarDays className="h-4 w-4" /> पिछले दिन
        </h2>
        <DayList days={older} />
      </section>

      <section className="space-y-2">
        <h2 className="px-1 text-sm font-semibold text-muted-foreground">इस चक्र का हिसाब</h2>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">
              {cycle ? `${formatDateDMY(cycle.cycle_start)} – ${formatDateDMY(cycle.cycle_end)}` : 'चालू चक्र'}
            </div>
            <div className="mt-1 text-3xl font-bold tabular-nums text-primary">
              {formatRupeesRounded(liveTotal?.amount ?? 0)}
            </div>
            <div className="mt-1 text-sm text-muted-foreground tabular-nums">
              {formatLitresShort(liveTotal?.qty ?? 0)} लीटर · {liveTotal?.sessions ?? 0} बार
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-2">
          <SmallStat
            icon={<Receipt className="h-4 w-4" />}
            label="पिछला बिल"
            value={lastPaid ? formatRupeesRounded(lastPaid.paid_amount) : '—'}
            sub={lastPaid?.paid_on ? `भुगतान ${formatDateDMY(lastPaid.paid_on)}` : ''}
          />
          <SmallStat
            icon={<Wallet className="h-4 w-4" />}
            label="अग्रिम बकाया"
            value={formatRupeesRounded(advanceDue)}
            sub={advanceDue > 0 ? 'अगले बिल से कटेगा' : 'कोई बकाया नहीं'}
            highlight={advanceDue > 0}
          />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="px-1 text-sm font-semibold text-muted-foreground">पिछले बिल</h2>
        {(bills ?? []).length === 0
          ? <p className="px-1 text-sm text-muted-foreground">अभी कोई बिल नहीं</p>
          : bills.map((b: any) => <BillCard key={b.id} bill={b} token={token} />)}
      </section>

      {/* Offered under the figures, not over them: the farmer opened this to
          see what he earned, not to be asked to set something up. */}
      {offerPhone && (
        <PhoneCaptureCard
          callFn={(path, body) => callFn(path, body, token)}
          onSaved={() => setPhoneAdded(true)}
          onDismiss={() => setPhoneDismissed(true)}
        />
      )}
      {(offerPin || pinPanel === 'open') && (
        <PinSetupCard
          callFn={(path, body) => callFn(path, body, token)}
          hasPin={!!pin?.isSet}
          onDone={() => { setPinPanel('hidden'); setPinDismissed(true); }}
          onDismiss={() => { setPinPanel('hidden'); setPinDismissed(true); }}
        />
      )}

      {pin?.isSet && pinPanel === 'hidden' && (
        <Button
          variant="outline"
          className="h-11 w-full text-sm"
          onClick={() => setPinPanel('open')}
        >
          <KeyRound className="mr-1 h-4 w-4" /> PIN बदलें
        </Button>
      )}
    </div>
  );
};

const SmallStat: React.FC<{ icon: React.ReactNode; label: string; value: string; sub?: string; highlight?: boolean }> = ({ icon, label, value, sub, highlight }) => (
  <Card className={highlight ? 'border-amber-400 bg-amber-50' : ''}>
    <CardContent className="p-3">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-1 text-lg font-bold tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </CardContent>
  </Card>
);

const BillCard: React.FC<{ bill: any; token: string }> = ({ bill, token }) => {
  const { toast } = useToast();
  const period = bill.farmer_payout_cycles
    ? `${formatDateDMY(bill.farmer_payout_cycles.cycle_start)} – ${formatDateDMY(bill.farmer_payout_cycles.cycle_end)}`
    : '';

  const downloadPdf = async () => {
    try {
      const r = await callFn(`farmer-bill-pdf?payout_id=${bill.id}`, undefined, token);
      if (r.url) window.open(r.url, '_blank');
    } catch (e: any) {
      toast({ title: 'बिल नहीं खुला', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-medium">{period || bill.bill_number}</div>
            <div className="text-[11px] text-muted-foreground">{bill.bill_number}</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold tabular-nums">{formatRupeesRounded(bill.net_payable)}</div>
            {bill.status === 'paid' && Number(bill.unpaid_balance) === 0 && (
              <Badge className="bg-green-100 text-[10px] text-green-700">भुगतान हो गया</Badge>
            )}
            {bill.status === 'paid' && Number(bill.unpaid_balance) > 0 && (
              <Badge className="bg-amber-100 text-[10px] text-amber-700">
                {formatRupeesRounded(bill.unpaid_balance)} बकाया
              </Badge>
            )}
            {bill.status === 'finalized' && <Badge variant="secondary" className="text-[10px]">तैयार</Badge>}
          </div>
        </div>

        {/* Plain sentences rather than a row of columns: this is where a farmer
            asks why the bill is less than the milk. */}
        <div className="mt-2 space-y-0.5 text-sm text-muted-foreground tabular-nums">
          <div>दूध: {formatLitresShort(bill.total_quantity)} लीटर · {formatRupees(bill.total_amount)}</div>
          {Number(bill.advances_deducted) > 0 && (
            <div className="text-orange-600">अग्रिम कटा: −{formatRupees(bill.advances_deducted)}</div>
          )}
          {Number(bill.carry_forward_in) > 0 && (
            <div className="text-red-600">पिछला बकाया जुड़ा: +{formatRupees(bill.carry_forward_in)}</div>
          )}
        </div>

        {bill.pdf_storage_path && (
          <Button size="sm" variant="outline" className="mt-3 h-11 w-full text-sm" onClick={downloadPdf}>
            <Download className="mr-1 h-4 w-4" /> बिल डाउनलोड
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default FarmerPortal;
