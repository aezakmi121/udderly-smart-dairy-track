import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, X, Share } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

const DISMISSED_KEY = 'farmer_install_dismissed';

/** iOS gives no install prompt, so Safari users need telling where to look. */
const isIosSafari = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
};

/**
 * Offer to put the portal on the farmer's home screen.
 *
 * Shown only after they have successfully seen their own figures, and below
 * them. A first-time visitor who has just scanned a QR is trying to find out
 * what they earned; interrupting that with an install banner is how a farmer
 * decides the app is a nuisance. Once they have the number in front of them,
 * "keep this" is a reasonable thing to ask.
 */
export const FarmerInstallPrompt: React.FC = () => {
  const { isInstallable, isInstalled, installApp } = usePWAInstall();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISSED_KEY) === 'yes');
    } catch {
      setDismissed(false);
    }
  }, []);

  const hide = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, 'yes');
    } catch {
      /* asked again next time, which is no worse than nagging */
    }
  };

  if (isInstalled || dismissed) return null;

  const ios = isIosSafari();
  if (!isInstallable && !ios) return null;

  return (
    <Card className="border-primary/40 bg-secondary">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-base font-semibold">फ़ोन में जोड़ें</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              हर बार QR स्कैन किए बिना, सीधे खोलकर अपना हिसाब देखें।
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={hide} aria-label="बंद करें">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {ios ? (
          // Safari has no programmatic install; these are the actual steps.
          <p className="flex items-center gap-2 rounded-lg bg-card p-2 text-sm">
            <Share className="h-4 w-4 shrink-0" />
            नीचे <strong>Share</strong> दबाएँ, फिर <strong>Add to Home Screen</strong> चुनें।
          </p>
        ) : (
          <Button className="h-12 w-full text-base" onClick={() => void installApp()}>
            <Download className="mr-1 h-4 w-4" /> जोड़ें
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
