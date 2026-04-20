import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SecureInput } from '@/components/ui/secure-input';
import { supabase } from '@/integrations/supabase/client';

const hasRecoveryHash = () => {
  const hash = window.location.hash || '';
  return hash.includes('type=recovery') || hash.includes('access_token=');
};

const ResetPassword = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let mounted = true;
    const inRecoveryFlow = hasRecoveryHash();

    // Listen for the PASSWORD_RECOVERY event Supabase emits when a recovery
    // link is processed. This is the only event we trust.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
        setError('');
      }
    });

    // If the URL contains a recovery hash, allow the form to render even
    // before/without the PASSWORD_RECOVERY event (some browsers race).
    if (inRecoveryFlow) {
      setReady(true);
    }

    // If the user lands here without a recovery hash AND no event fires,
    // surface a helpful error after a short window.
    const timer = setTimeout(() => {
      if (!mounted) return;
      if (!hasRecoveryHash()) {
        setReady((r) => {
          if (!r) {
            setError('This page is only accessible from a password reset email link. Please request a new reset email.');
          }
          return r;
        });
      }
    }, 1500);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const validate = (pw: string) => {
    if (pw.length < 8) return 'Password must be at least 8 characters long';
    if (!/[a-z]/.test(pw)) return 'Password must contain at least one lowercase letter';
    if (!/[A-Z]/.test(pw)) return 'Password must contain at least one uppercase letter';
    if (!/\d/.test(pw)) return 'Password must contain at least one digit';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const pwError = validate(password);
    if (pwError) return setError(pwError);
    if (password !== confirm) return setError('Passwords do not match');

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess('Password updated successfully. Redirecting…');
    // Clean the recovery hash so a refresh doesn't loop us back.
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    setTimeout(async () => {
      await supabase.auth.signOut();
      navigate('/auth', { replace: true });
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-green-700">Reset your password</CardTitle>
          <CardDescription>Enter a new password for your account</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="mb-4">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {!ready && !error ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Verifying reset link…</div>
          ) : ready ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <SecureInput
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  showStrengthMeter
                  preventClipboard
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm New Password</Label>
                <SecureInput
                  id="confirm"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  preventClipboard
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Updating…' : 'Update Password'}
              </Button>
            </form>
          ) : (
            <Button onClick={() => navigate('/auth')} variant="outline" className="w-full">
              Back to Sign In
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
