// Hindi-first farmer portal -- read-only, mobile-first, today first.
import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogOut, Phone, Receipt, Wallet, CalendarDays, Download } from 'lucide-react';
import { DayHero, DaySessions, DayList } from '@/components/farmer-view';
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
  if (!res.ok) throw new Error(data.error ?? 'Request failed');
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
        {!token
          ? <LoginCard onToken={(t) => { localStorage.setItem(TOKEN_KEY, t); setToken(t); }} />
          : <PortalHome token={token} onUnauthorized={logout} />}
      </main>
    </div>
  );
};

const LoginCard: React.FC<{ onToken: (t: string) => void }> = ({ onToken }) => {
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [channel, setChannel] = useState('');
  const { toast } = useToast();

  const sendOtp = async () => {
    const p = phone.replace(/\D/g, '').slice(-10);
    if (p.length !== 10) { toast({ title: 'सही नंबर डालें', variant: 'destructive' }); return; }
    setBusy(true);
    try {
      const r = await callFn('farmer-send-otp', { phone_number: p });
      setChannel(r.channel ?? '');
      setStep('otp');
      toast({ title: r.channel === 'whatsapp' ? 'OTP WhatsApp पर भेजा गया' : 'OTP जल्द मिलेगा', description: r.channel === 'staff' ? 'दफ़्तर वाले से OTP पूछें' : '' });
    } catch (e: any) {
      toast({ title: 'भेज नहीं सका', description: e.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const verify = async () => {
    if (!/^\d{6}$/.test(code)) { toast({ title: '6 अंक डालें', variant: 'destructive' }); return; }
    setBusy(true);
    try {
      const r = await callFn('farmer-verify-otp', { phone_number: phone, code });
      onToken(r.token);
    } catch (e: any) {
      toast({ title: 'गलत OTP', description: e.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <h1 className="text-center text-xl font-bold">अपना दूध हिसाब देखें</h1>
        {step === 'phone' && (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium">मोबाइल नंबर</label>
              <div className="flex gap-2">
                <span className="flex h-12 items-center rounded bg-muted px-3 text-base">+91</span>
                <Input className="h-12 text-base" inputMode="numeric" maxLength={10} placeholder="98xxxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} />
              </div>
            </div>
            <Button className="h-12 w-full text-base" onClick={sendOtp} disabled={busy}>
              {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Phone className="mr-1 h-4 w-4" />} OTP भेजें
            </Button>
          </>
        )}
        {step === 'otp' && (
          <>
            <div className="text-center text-sm text-muted-foreground">
              {channel === 'whatsapp' ? 'WhatsApp पर 6 अंकों का OTP आया है' : 'दफ़्तर वाले से OTP पूछें'}
            </div>
            <Input className="h-14 text-center text-2xl tracking-[0.5em]" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
            <Button className="h-12 w-full text-base" onClick={verify} disabled={busy}>
              {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} पुष्टि करें
            </Button>
            <Button variant="ghost" className="w-full text-xs" onClick={() => setStep('phone')}>नंबर बदलें</Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

const PortalHome: React.FC<{ token: string; onUnauthorized: () => void }> = ({ token, onUnauthorized }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

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

  const { farmer, cycle, liveTotal, bills, advances } = data;
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
