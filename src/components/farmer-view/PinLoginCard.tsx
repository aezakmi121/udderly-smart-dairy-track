import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, QrCode, Store, ArrowLeft } from 'lucide-react';
import { PinPad } from './PinPad';
import { normalisePhone, MAX_ATTEMPTS } from '../../../supabase/functions/_shared/farmerPin';

interface PinLoginCardProps {
  onToken: (token: string) => void;
  callFn: (path: string, body?: unknown) => Promise<any>;
}

/**
 * Mobile number and PIN, for farmers who have set one.
 *
 * The QR stays first on the screen: it is the only way in for the 32 of 61
 * farmers with no number on file, and it needs no memory at all.
 */
export const PinLoginCard: React.FC<PinLoginCardProps> = ({ onToken, callFn }) => {
  const [mode, setMode] = useState<'choose' | 'pin'>('choose');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (candidate = pin) => {
    if (!normalisePhone(phone)) {
      setError('अपना 10 अंकों का मोबाइल नंबर डालें');
      return;
    }
    if (candidate.length !== 4) return;

    setBusy(true);
    setError(null);
    try {
      const r = await callFn('farmer-pin-login', { phone_number: phone, pin: candidate });
      onToken(r.token);
    } catch (e: any) {
      setPin('');
      const code = String(e?.code ?? e?.message ?? '');
      if (code.includes('locked')) {
        setError(`${MAX_ATTEMPTS} बार गलत PIN। 15 मिनट बाद कोशिश करें, या कलेक्शन सेंटर पर PIN हटवाएँ।`);
      } else if (typeof e?.attempts_left === 'number') {
        setError(`PIN गलत है। ${e.attempts_left} कोशिश बाकी।`);
      } else {
        setError('नंबर या PIN गलत है।');
      }
    } finally {
      setBusy(false);
    }
  };

  if (mode === 'choose') {
    return (
      <Card>
        <CardContent className="space-y-4 p-5 text-center">
          <h1 className="text-xl font-bold">अपना दूध हिसाब देखें</h1>

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <QrCode className="h-8 w-8" />
          </div>
          <p className="text-base">अपनी पर्ची पर बना QR कोड फ़ोन के कैमरे से स्कैन करें।</p>
          <p className="text-sm text-muted-foreground">
            हर पर्ची पर वही QR होता है — पुरानी पर्ची से भी चलेगा।
          </p>

          <div className="flex items-center gap-3 pt-1">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">या</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" className="h-12 w-full text-base" onClick={() => setMode('pin')}>
            मोबाइल नंबर और PIN से आएँ
          </Button>

          <div className="flex items-start gap-2 rounded-xl bg-muted p-3 text-left text-sm">
            <Store className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span>
              PIN भूल गए या पर्ची नहीं है, तो कलेक्शन सेंटर पर पूछें — वहाँ PIN हटाया जा सकता है और
              आपका पूरा हिसाब देखा जा सकता है।
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2"
          onClick={() => { setMode('choose'); setError(null); setPin(''); }}
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> वापस
        </Button>

        <div>
          <label className="mb-1 block text-base font-medium" htmlFor="farmer-phone">
            मोबाइल नंबर
          </label>
          <div className="flex gap-2">
            <span className="flex h-14 items-center rounded-xl bg-muted px-3 text-lg">+91</span>
            <Input
              id="farmer-phone"
              className="h-14 text-lg tabular-nums"
              inputMode="numeric"
              maxLength={10}
              placeholder="98xxxxxxxx"
              value={phone}
              onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '')); setError(null); }}
            />
          </div>
        </div>

        <PinPad
          label="4 अंकों का PIN"
          value={pin}
          onChange={(v) => { setPin(v); setError(null); }}
          onComplete={(v) => void submit(v)}
          disabled={busy}
        />

        {error && <p className="text-center text-sm text-destructive">{error}</p>}

        <Button className="h-12 w-full text-base" onClick={() => void submit()} disabled={busy || pin.length !== 4}>
          {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} देखें
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          PIN नहीं बनाया? पर्ची का QR स्कैन करके बनाएँ।
        </p>
      </CardContent>
    </Card>
  );
};
