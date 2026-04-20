import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * If the user lands on ANY route with a Supabase recovery hash
 * (`#access_token=...&type=recovery`), redirect them to /reset-password
 * preserving the hash so the recovery session can be processed there.
 *
 * This guards against the case where the Supabase project's Site URL is
 * configured to the app root and the recovery email link drops the user
 * onto / instead of /reset-password.
 */
export const RecoveryRedirect = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash || '';
    const isRecovery = hash.includes('type=recovery');
    if (isRecovery && location.pathname !== '/reset-password') {
      navigate(`/reset-password${hash}`, { replace: true });
    }
  }, [location.pathname, navigate]);

  return null;
};
