import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SecureInput } from '@/components/ui/secure-input';
import { supabase } from '@/integrations/supabase/client';

type Stage = 'verifying' | 'form' | 'success' | 'invalid' | 'resend';

const passwordRules = (pw: string): string => {
  if (pw.length < 8) return 'Password must be at least 8 characters';
  if (!/[a-z]/.test(pw)) return 'Password must contain a lowercase letter';
  if (!/[A-Z]/.test(pw)) return 'Password must contain an uppercase letter';
  if (!/\d/.test(pw)) return 'Password must contain a number';
  return '';
};

const ResetPassword = () => {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>('verifying');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Resend form state
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [resendError, setResendError] = useState('');

  useEffect(() => {
    let mounted = true;

    // If the URL hash still contains a recovery token (hash arrives before SDK clears it),
    // trust it immediately — the PASSWORD_RECOVERY event will follow shortly.
    const hash = window.location.hash || '';
    if (hash.includes('type=recovery') || hash.includes('access_token=')) {
      if (mounted) setStage('form');
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY') {
        setStage('form');
        setError('');
      }
    });

    // After 3 seconds with no recovery signal, show the invalid-link screen
    const timer = setTimeout(() => {
      if (!mounted) return;
      setStage(prev => (prev === 'verifying' ? 'invalid' : prev));
    }, 3000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const pwError = passwordRules(password);
    if (pwError) return setError(pwError);
    if (password !== confirm) return setError('Passwords do not match');

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    // Clear the recovery hash from the URL so a refresh doesn't loop
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }

    setStage('success');

    // Sign out the recovery session and send to login
    setTimeout(async () => {
      await supabase.auth.signOut();
      navigate('/auth', { replace: true });
    }, 2000);
  };

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setResendError('');
    setResendLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(resendEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setResendLoading(false);

    if (error) {
      setResendError(error.message);
    } else {
      setResendSent(true);
    }
  };

  // ── Verifying stage ──────────────────────────────────────────────────────
  if (stage === 'verifying') {
    return (
      <PageShell>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-green-700">Reset your password</CardTitle>
          <CardDescription>Verifying your reset link…</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
          </div>
        </CardContent>
      </PageShell>
    );
  }

  // ── Invalid / expired link ────────────────────────────────────────────────
  if (stage === 'invalid') {
    return (
      <PageShell>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-red-600">Link invalid or expired</CardTitle>
          <CardDescription>
            This password reset link has expired or has already been used.
            Request a new one below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {stage === 'invalid' && !resendSent && (
            <form onSubmit={handleResend} className="space-y-4">
              {resendError && (
                <Alert variant="destructive">
                  <AlertDescription>{resendError}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="resend-email">Your email address</Label>
                <Input
                  id="resend-email"
                  type="email"
                  value={resendEmail}
                  onChange={e => setResendEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={resendLoading}>
                {resendLoading ? 'Sending…' : 'Send new reset link'}
              </Button>
            </form>
          )}

          {resendSent && (
            <Alert>
              <AlertDescription>
                Reset email sent to <strong>{resendEmail}</strong>. Check your inbox and spam folder.
              </AlertDescription>
            </Alert>
          )}

          <Button variant="outline" className="w-full" onClick={() => navigate('/auth')}>
            Back to sign in
          </Button>
        </CardContent>
      </PageShell>
    );
  }

  // ── Success ───────────────────────────────────────────────────────────────
  if (stage === 'success') {
    return (
      <PageShell>
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl">
            ✓
          </div>
          <CardTitle className="text-2xl font-bold text-green-700">Password updated!</CardTitle>
          <CardDescription>Signing you out and redirecting to sign in…</CardDescription>
        </CardHeader>
      </PageShell>
    );
  }

  // ── Reset form ────────────────────────────────────────────────────────────
  return (
    <PageShell>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-green-700">Choose a new password</CardTitle>
        <CardDescription>Enter and confirm your new password below</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <SecureInput
              id="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              showStrengthMeter
              preventClipboard
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm new password</Label>
            <SecureInput
              id="confirm"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              preventClipboard
            />
          </div>
          <Button type="submit" className="w-full bg-green-700 hover:bg-green-800" disabled={loading}>
            {loading ? 'Updating…' : 'Update password'}
          </Button>
        </form>
        <div className="mt-4 text-center">
          <Button variant="link" className="text-sm" onClick={() => navigate('/auth')}>
            Back to sign in
          </Button>
        </div>
      </CardContent>
    </PageShell>
  );
};

const PageShell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
    <Card className="w-full max-w-md">{children}</Card>
  </div>
);

export default ResetPassword;
