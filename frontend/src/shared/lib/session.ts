/**
 * Client-side auth session store.
 *
 * The access token lives in memory only (never persisted). The refresh token is
 * client-managed in localStorage because the API returns it in the response body
 * (architecture §3.4 prefers an httpOnly cookie; switch to that when the backend
 * sets one). External subscribers (ProtectedRoute via useSyncExternalStore) are
 * notified on every change so routing reacts to login / logout / refresh.
 */
export type SessionStatus = 'unknown' | 'authenticated' | 'unauthenticated';

const REFRESH_KEY = 'flamingo.refreshToken';

let accessToken: string | null = null;
let status: SessionStatus = 'unknown';

const listeners = new Set<() => void>();

// useSyncExternalStore needs a stable snapshot reference between changes.
let snapshot: { status: SessionStatus } = { status };

function emit(): void {
  snapshot = { status };
  listeners.forEach((listener) => listener());
}

export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSessionSnapshot(): { status: SessionStatus } {
  return snapshot;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

/** Persist a freshly issued token pair (login / register / refresh rotation). */
export function setSession(token: string, refreshToken: string): void {
  accessToken = token;
  status = 'authenticated';
  try {
    localStorage.setItem(REFRESH_KEY, refreshToken);
  } catch {
    /* storage unavailable — access token in memory still works for this tab */
  }
  emit();
}

/** Drop all credentials (logout, or an unrecoverable refresh failure). */
export function clearSession(): void {
  accessToken = null;
  status = 'unauthenticated';
  try {
    localStorage.removeItem(REFRESH_KEY);
  } catch {
    /* ignore */
  }
  emit();
}

/** Mark the session resolved-but-anonymous (boot with no refresh token). */
export function markUnauthenticated(): void {
  status = 'unauthenticated';
  emit();
}
