import { setSession } from '@/shared/lib/session';

/** Persist the token pair returned by login / register so the session is live. */
export function applyAuth(payload: { token: string; refreshToken: string }): void {
  setSession(payload.token, payload.refreshToken);
}
