import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

/**
 * Intercepts Supabase password-recovery flows and routes the user to /reset-password.
 *
 * Two cases are handled:
 *
 * 1. Hash still in URL (implicit flow, fast load):
 *    The recovery link lands on any page with `#access_token=...&type=recovery`.
 *    We redirect to /reset-password before the Supabase SDK can clear the hash.
 *
 * 2. Hash already consumed by SDK (slower / PKCE flow):
 *    The SDK has already parsed the token and fires a PASSWORD_RECOVERY auth event.
 *    We listen for that event and redirect in response.
 */
export const RecoveryRedirect = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Case 1: check the raw URL hash before Supabase clears it
    const hash = window.location.hash || '';
    if (hash.includes('type=recovery') && location.pathname !== '/reset-password') {
      navigate(`/reset-password${hash}`, { replace: true });
      return;
    }

    // Case 2: listen for the PASSWORD_RECOVERY event the SDK fires once it has
    // processed a recovery token (by which point the hash may already be gone)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' && location.pathname !== '/reset-password') {
        navigate('/reset-password', { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [location.pathname, navigate]);

  return null;
};
