import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Smartphone, Check } from 'lucide-react';
import { normalisePhone } from '../../../supabase/functions/_shared/farmerPin';

interface PhoneCaptureCardProps {
  callFn: (path: string, body?: unknown) => Promise<any>;
  onSaved: (phone: string) => void;
  onDismiss?: () => void;
}

/**
 * Asking a farmer for their mobile number, once they are already looking at
 * their own figures.
 *
 * Asked here rather than at the counter because this is the moment the reason
 * is obvious: they have just seen what they earned, and the number is what
 * lets them see it again without the slip.
 */
export const PhoneCaptureCard: React.FC<PhoneCaptureCardProps> = ({
  callFn,
  onSaved,
  onDismiss,
}) => {
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const save = async () => {
    if (!normalisePhone(phone)) {
      setError('10 अंकों का नंबर डालें');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await callFn('farmer-set-phone', { phone_number: phone });
      setDone(true);
      onSaved(r.phone_number ?? phone);
    } catch (e: any) {
      const code = String(e?.code ?? e?.message ?? '');
      if (code.includes('phone_taken')) {
        setError('यह नंबर पहले से किसी और के नाम पर है। कलेक्शन सेंटर पर बताएँ।');
      } else if (code.includes('already_set')) {
        setError('आपका नंबर पहले से दर्ज है। बदलवाने के लिए कलेक्शन सेंटर पर कहें।');
      } else if (code.includes('invalid_phone')) {
        setError('10 अंकों का नंबर डालें');
      } else {
        setError('नंबर सेव नहीं हुआ, दोबारा कोशिश करें');
      }
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <Card className="border-accent">
        <CardContent className="space-y-1 p-5 text-center">
          <Check className="mx-auto h-9 w-9 text-accent" />
          <p className="text-base font-medium">नंबर जुड़ गया</p>
          <p className="text-sm text-muted-foreground">अब आप इसी नंबर से PIN बना सकते हैं।</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold">अपना मोबाइल नंबर जोड़ें</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          नंबर जुड़ने के बाद आप PIN बना सकते हैं और पर्ची के बिना भी अपना हिसाब देख सकते हैं।
        </p>

        <div className="flex gap-2">
          <span className="flex h-14 items-center rounded-xl bg-muted px-3 text-lg">+91</span>
          <Input
            className="h-14 text-lg tabular-nums"
            inputMode="numeric"
            maxLength={10}
            placeholder="98xxxxxxxx"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value.replace(/\D/g, ''));
              setError(null);
            }}
            aria-label="मोबाइल नंबर"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button className="h-12 w-full text-base" onClick={save} disabled={busy}>
          {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} जोड़ें
        </Button>

        {onDismiss && (
          <Button variant="ghost" className="w-full text-sm" onClick={onDismiss}>
            अभी नहीं
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
