import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { useVerifyEmail } from './useAccountRecovery';

/**
 * Opening the emailed link redeems its token: a one-shot mutation on mount — not a query (it
 * changes the account and must never be retried or refetched) and never from a render. The
 * ref guards StrictMode's double effect: the token is spent on first use.
 */
export const useEmailVerification = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token')?.trim() ?? '';
  const verify = useVerifyEmail();
  const { mutate } = verify;
  const started = useRef(false);

  useEffect(() => {
    if (token && !started.current) {
      started.current = true;
      mutate({ token });
    }
  }, [token, mutate]);

  return { token, verify };
};
