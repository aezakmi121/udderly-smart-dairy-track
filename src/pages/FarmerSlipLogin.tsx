import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const TOKEN_KEY = 'farmer_portal_token';

/**
 * Landing page for the QR printed on a collection slip.
 *
 * Trades the slip's token for a portal session and forwards to the portal, so
 * a farmer scans once and is simply looking at their own earnings. The token
 * never reaches the portal URL, and is replaced in history rather than pushed,
 * so going back does not re-expose it.
 */
export const FarmerSlipLogin: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const exchange = async () => {
      if (!token) {
        setError('इस लिंक में कोई कोड नहीं है');
        return;
      }
      try {
        const { data, error: fnError } = await supabase.functions.invoke('farmer-token-login', {
          body: { token },
        });
        if (cancelled) return;
        if (fnError || !data?.token) {
          setError('यह पर्ची अब मान्य नहीं है। दफ़्तर से नई पर्ची लें।');
          return;
        }
        localStorage.setItem(TOKEN_KEY, data.token);
        navigate('/farmer', { replace: true });
      } catch {
        if (!cancelled) setError('अभी जुड़ नहीं पाए। दोबारा कोशिश करें।');
      }
    };

    void exchange();
    return () => {
      cancelled = true;
    };
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="p-6 text-center space-y-4">
          {error ? (
            <>
              <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
              <p className="text-sm">{error}</p>
              <Button className="w-full" onClick={() => navigate('/farmer', { replace: true })}>
                मोबाइल नंबर से देखें
              </Button>
            </>
          ) : (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">आपका हिसाब खुल रहा है…</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
