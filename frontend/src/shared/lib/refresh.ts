import { GRAPHQL_HTTP_URL } from './env';
import {
  clearSession,
  enterPreviewSession,
  getRefreshToken,
  markUnauthenticated,
  setSession,
} from './session';

/**
 * Exchanges the stored refresh token for a fresh pair via a raw fetch, bypassing
 * Apollo so it can be called from the error link without recursion. De-duped so
 * concurrent auth failures trigger a single network refresh.
 */
let refreshInFlight: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(GRAPHQL_HTTP_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query:
          'mutation Refresh($r: String!) { refreshToken(refreshToken: $r) { token refreshToken } }',
        variables: { r: refreshToken },
      }),
    });
    const json = (await res.json()) as {
      data?: { refreshToken?: { token: string; refreshToken: string } };
    };
    const payload = json.data?.refreshToken;
    if (payload?.token) {
      setSession(payload.token, payload.refreshToken);
      return true;
    }
  } catch {
    /* network failure — fall through to clear */
  }
  clearSession();
  return false;
}

export function refreshAccessToken(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/** Restore a session on app boot: refresh if a token exists, else go anonymous. */
export async function bootstrapSession(): Promise<void> {
  // TEMPORARY: preview builds (VITE_PREVIEW=1) skip auth so the design can be
  // browsed without a backend while testing. Remove before real launch.
  if (import.meta.env.VITE_PREVIEW === '1') {
    enterPreviewSession();
    return;
  }
  if (getRefreshToken()) {
    await refreshAccessToken();
  } else {
    markUnauthenticated();
  }
}
