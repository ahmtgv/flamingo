import { useApolloClient } from '@apollo/client';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { clearSession } from '@/shared/lib/session';

import { useAppDispatch } from './hooks';
import { setAgeMode } from './uiSlice';

/** Clear the session, reset cached server data, and return to /login. */
export function useLogout() {
  const client = useApolloClient();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  return useCallback(async () => {
    clearSession();
    dispatch(setAgeMode('default'));
    await client.clearStore();
    navigate('/login', { replace: true });
  }, [client, dispatch, navigate]);
}
