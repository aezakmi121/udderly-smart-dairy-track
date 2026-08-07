import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, KeyRound, Check } from 'lucide-react';
import { PinPad } from './PinPad';
import { pinProblem, type PinProblem } from '../../../supabase/functions/_shared/farmerPin';

const WHY_NOT: Record<PinProblem, string> = {
  length: '4 अंक डालें',
  digits: 'सिर्फ़ अंक डालें',
  common: 'यह PIN बहुत आम है, दूसरा चुनें',
  sequence: 'लगातार अंक न चुनें, जैसे 1234',
  repeated: 'चारों अंक एक जैसे न रखें',
};

interface PinSetupCardProps {
  callFn: (path: string, body?: unknown) => Promise<any>;
  /** Already has a PIN: changing it needs the current one. */
  hasPin: boolean;
  onDone: () => void;
  onDismiss?: () => void;
}

/**
 * Choosing a PIN, offered once a farmer is in through the QR.
 *
 * Changing an existing PIN asks for the current one. The session came from a
 * slip, and whoever picks up a dropped slip has one -- letting them set a PIN
 * would lock the farmer out of their own account. A forgotten PIN is cleared at
 * the counter instead.
 */
export const PinSetupCard: React.FC<PinSetupCardProps> = ({ callFn, hasPin, onDone, onDismiss }) => {
  const [step, setStep] = useState<'current' | 'new' | 'confirm' | 'done'>(
    hasPin ? 'current' : 'new'
  );
  const [current, setCurrent] = useState('');
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (confirmed: string) => {
    if (confirmed !== pin) {
      setError('दोनों PIN एक जैसे नहीं हैं');
      setConfirm('');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await callFn('farmer-set-pin', hasPin ? { pin, current_pin: current } : { pin });
      setStep('done');
      onDone();
    } catch (e: any) {
      const code = String(e?.code ?? e?.message ?? '');
      if (code.includes('current_pin_wrong')) {
        setError('पुराना PIN गलत है');
        setStep('current');
        setCurrent('');
      } else if (code.includes('no_phone')) {
        setError('पहले कलेक्शन सेंटर पर अपना मोबाइल नंबर दर्ज कराएँ');
      } else if (code.includes('weak_pin')) {
        setError('यह PIN सुरक्षित नहीं है, दूसरा चुनें');
        setStep('new');
        setPin('');
        setConfirm('');
      } else {
        setError('PIN सेव नहीं हुआ, दोबारा कोशिश करें');
      }
    } finally {
      setBusy(false);
    }
  };

  if (step === 'done') {
    return (
      <Card className="border-accent">
        <CardContent className="space-y-2 p-5 text-center">
          <Check className="mx-auto h-10 w-10 text-accent" />
          <p className="text-base font-medium">PIN बन गया</p>
          <p className="text-sm text-muted-foreground">
            अगली बार मोबाइल नंबर और यही PIN डालकर आ सकते हैं — पर्ची की ज़रूरत नहीं।
          </p>
        </CardContent>
      </Card>
    );
  }

  const problem = step === 'new' && pin.length === 4 ? pinProblem(pin) : null;

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold">{hasPin ? 'PIN बदलें' : 'अपना PIN बनाएँ'}</h2>
        </div>

        {!hasPin && step === 'new' && (
          <p className="text-sm text-muted-foreground">
            PIN बनाने के बाद पर्ची के बिना भी, सिर्फ़ मोबाइल नंबर और PIN से अपना हिसाब देख सकते हैं।
          </p>
        )}

        {step === 'current' && (
          <PinPad
            label="पुराना PIN"
            value={current}
            autoFocus
            onChange={(v) => { setCurrent(v); setError(null); }}
            onComplete={() => setStep('new')}
          />
        )}

        {step === 'new' && (
          <PinPad
            label="नया PIN"
            value={pin}
            autoFocus
            onChange={(v) => { setPin(v); setError(null); }}
            onComplete={(v) => { if (!pinProblem(v)) setStep('confirm'); }}
          />
        )}

        {step === 'confirm' && (
          <PinPad
            label="PIN दोबारा डालें"
            value={confirm}
            autoFocus
            disabled={busy}
            onChange={(v) => { setConfirm(v); setError(null); }}
            onComplete={(v) => void save(v)}
          />
        )}

        {problem && <p className="text-center text-sm text-destructive">{WHY_NOT[problem]}</p>}
        {error && <p className="text-center text-sm text-destructive">{error}</p>}
        {busy && <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />}

        {onDismiss && !hasPin && (
          <Button variant="ghost" className="w-full text-sm" onClick={onDismiss}>
            अभी नहीं
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
