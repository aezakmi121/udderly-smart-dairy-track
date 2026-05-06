// Hindi-first farmer portal — read-only, mobile-first
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, LogOut, Phone, Receipt, Wallet, Calendar, Download } from 'lucide-react';

const TOKEN_KEY = 'farmer_portal_token';
const inrFmt = new Intl.NumberFormat('hi-IN', { maximumFractionDigits: 0 });
const inr = (n: number) => `₹${inrFmt.format(Math.round(n))}`;
const fmtDate = (s?: string | null) => s ? new Date(s).toLocaleDateString('hi-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';

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
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-background pb-10">
      <header className="bg-primary text-primary-foreground p-4 flex items-center justify-between shadow">
        <div>
          <div className="text-lg font-bold">किसान पोर्टल</div>
          <div className="text-[11px] opacity-80">Farmer Portal</div>
        </div>
        {token && <Button size="sm" variant="secondary" onClick={logout}><LogOut className="h-4 w-4 mr-1" /> लॉगआउट</Button>}
      </header>
      <main className="max-w-md mx-auto p-3 space-y-3">
        {!token ? <LoginCard onToken={(t) => { localStorage.setItem(TOKEN_KEY, t); setToken(t); }} /> : <PortalHome token={token} onUnauthorized={logout} />}
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
      <CardHeader><CardTitle className="text-center text-xl">अपना दूध हिसाब देखें</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {step === 'phone' && (
          <>
            <div>
              <label className="text-sm font-medium block mb-1">मोबाइल नंबर</label>
              <div className="flex gap-2">
                <span className="h-12 px-3 flex items-center bg-muted rounded text-base">+91</span>
                <Input className="text-base h-12" inputMode="numeric" maxLength={10} placeholder="98xxxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} />
              </div>
            </div>
            <Button className="w-full h-12 text-base" onClick={sendOtp} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Phone className="h-4 w-4 mr-1" />} OTP भेजें
            </Button>
          </>
        )}
        {step === 'otp' && (
          <>
            <div className="text-center text-sm text-muted-foreground">
              {channel === 'whatsapp' ? 'WhatsApp पर 6 अंकों का OTP आया है' : 'दफ़्तर वाले से OTP पूछें'}
            </div>
            <Input className="text-center text-2xl tracking-[0.5em] h-14" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
            <Button className="w-full h-12 text-base" onClick={verify} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} पुष्टि करें
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

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (err) return <Card><CardContent className="p-4 text-destructive text-sm">{err}</CardContent></Card>;
  if (!data) return null;

  const { farmer, cycle, liveTotal, bills, advances, daily } = data;
  const lastPaid = bills?.find((b: any) => b.status === 'paid');
  const advanceDue = (advances ?? []).filter((a: any) => a.status === 'outstanding')
    .reduce((s: number, a: any) => s + (Number(a.amount) - Number(a.recovered_amount ?? 0)), 0);

  return (
    <div className="space-y-3">
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="p-4">
          <div className="text-xs opacity-80">{farmer?.farmer_code} · {farmer?.name}</div>
          <div className="mt-2 text-xs opacity-80">वर्तमान चक्र ({fmtDate(cycle?.cycle_start)} – {fmtDate(cycle?.cycle_end)})</div>
          <div className="text-3xl font-bold mt-1">{inr(liveTotal?.amount ?? 0)}</div>
          <div className="text-xs opacity-80 mt-1">{Number(liveTotal?.qty ?? 0).toFixed(1)} लीटर · {liveTotal?.sessions ?? 0} बार</div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        <SmallStat icon={<Receipt className="h-4 w-4" />} label="पिछला बिल" value={lastPaid ? inr(Number(lastPaid.paid_amount)) : '—'} sub={lastPaid?.paid_on ? `भुगतान ${fmtDate(lastPaid.paid_on)}` : ''} />
        <SmallStat icon={<Wallet className="h-4 w-4" />} label="अग्रिम बकाया" value={inr(advanceDue)} sub={advanceDue > 0 ? 'अगले बिल से कटेगा' : 'कोई बकाया नहीं'} highlight={advanceDue > 0} />
      </div>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-sm">पिछले बिल</CardTitle></CardHeader>
        <CardContent className="space-y-2 pt-0">
          {(bills ?? []).length === 0 && <div className="text-xs text-muted-foreground">अभी कोई बिल नहीं</div>}
          {bills?.map((b: any) => <BillRow key={b.id} bill={b} token={token} />)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4" /> रोज़ का दूध (30 दिन)</CardTitle></CardHeader>
        <CardContent className="pt-0 max-h-72 overflow-y-auto">
          <div className="space-y-1">
            {(daily ?? []).map((d: any, i: number) => (
              <div key={i} className="flex justify-between items-center text-xs border-b py-1">
                <div>
                  <div>{fmtDate(d.collection_date)} · {d.session === 'morning' ? 'सुबह' : 'शाम'}</div>
                  <div className="text-muted-foreground">{Number(d.quantity).toFixed(1)} L · F {Number(d.fat_percentage).toFixed(1)} · S {Number(d.snf_percentage).toFixed(1)}</div>
                </div>
                <div className={`font-medium ${d.is_accepted === false ? 'line-through opacity-50' : ''}`}>{inr(Number(d.total_amount))}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const SmallStat: React.FC<{ icon: React.ReactNode; label: string; value: string; sub?: string; highlight?: boolean }> = ({ icon, label, value, sub, highlight }) => (
  <Card className={highlight ? 'border-amber-400 bg-amber-50' : ''}>
    <CardContent className="p-3">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="text-lg font-bold mt-1">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </CardContent>
  </Card>
);

const BillRow: React.FC<{ bill: any; token: string }> = ({ bill, token }) => {
  const period = bill.farmer_payout_cycles ? `${fmtDate(bill.farmer_payout_cycles.cycle_start)} – ${fmtDate(bill.farmer_payout_cycles.cycle_end)}` : '';
  const downloadPdf = async () => {
    try {
      const r = await callFn(`farmer-bill-pdf?payout_id=${bill.id}`, undefined, token);
      if (r.url) window.open(r.url, '_blank');
    } catch (e: any) {
      alert(e.message);
    }
  };
  return (
    <div className="border rounded-lg p-2 text-sm">
      <div className="flex justify-between items-start">
        <div className="min-w-0">
          <div className="font-medium text-xs">{bill.bill_number}</div>
          <div className="text-[11px] text-muted-foreground">{period}</div>
        </div>
        <div className="text-right">
          <div className="font-bold">{inr(Number(bill.net_payable))}</div>
          {bill.status === 'paid' && Number(bill.unpaid_balance) === 0 && <Badge className="bg-green-100 text-green-700 text-[10px]">भुगतान हो गया</Badge>}
          {bill.status === 'paid' && Number(bill.unpaid_balance) > 0 && <Badge className="bg-amber-100 text-amber-700 text-[10px]">{inr(Number(bill.unpaid_balance))} बकाया</Badge>}
          {bill.status === 'finalized' && <Badge variant="secondary" className="text-[10px]">तैयार</Badge>}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1 mt-2 text-[11px] text-muted-foreground">
        <div>दूध: <span className="text-foreground">{Number(bill.total_quantity).toFixed(1)} L</span></div>
        {Number(bill.advances_deducted) > 0 && <div>अग्रिम: <span className="text-orange-600">−{inr(Number(bill.advances_deducted))}</span></div>}
        {Number(bill.carry_forward_in) > 0 && <div>पिछला: <span className="text-red-600">+{inr(Number(bill.carry_forward_in))}</span></div>}
      </div>
      {bill.pdf_storage_path && (
        <Button size="sm" variant="outline" className="w-full mt-2 h-8" onClick={downloadPdf}>
          <Download className="h-3 w-3 mr-1" /> बिल डाउनलोड
        </Button>
      )}
    </div>
  );
};

export default FarmerPortal;
