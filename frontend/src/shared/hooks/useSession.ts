import { useSyncExternalStore } from 'react';

import { getSessionSnapshot, subscribeSession } from '@/shared/lib/session';

/** Reactive view of the auth session status (unknown | authenticated | unauthenticated). */
export function useSession() {
  return useSyncExternalStore(subscribeSession, getSessionSnapshot);
}
