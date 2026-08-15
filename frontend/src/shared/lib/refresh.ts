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

/**
 * 🔴 Сколько ждать сервер, прежде чем признать, что связи нет (промпт 21 §2.1).
 *
 * Регрессия 16.08 от §Б0-септ. Раньше этого пути не существовало: токена в приложении не
 * бывало, `bootstrapSession()` сразу звал `markUnauthenticated()`. Связывание начало класть
 * сессию — и приложение при КАЖДОМ старте пошло её обновлять по коду, у которого не было
 * ни таймаута, ни `AbortController`. Сервер не ответил — `fetch` не вернулся — статус навсегда
 * остался `unknown` — «Загрузка…» без конца, без мастера и без ошибки.
 *
 * Десять секунд — это «человек уже понял, что что-то не так, но ещё не ушёл».
 */
const REFRESH_TIMEOUT_MS = 10_000;

async function doRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), REFRESH_TIMEOUT_MS);
  try {
    const res = await fetch(GRAPHQL_HTTP_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: abort.signal,
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
    /* сеть отказала или вышел таймаут — падаем в очистку */
  } finally {
    clearTimeout(timer);
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

/**
 * Restore a session on app boot: refresh if a token exists, else go anonymous.
 *
 * 🔴 ОБЯЗАН ЗАВЕРШИТЬСЯ ВСЕГДА (промпт 21 §2.1 п.2). Стартовый экран висит, пока статус
 * `unknown`; выйти из него можно только `setSession` или `clearSession`. Значит любой путь
 * отсюда — включая исключение — должен привести к одному из двух. `void bootstrapSession()`
 * в `App.tsx` отказ глотает, и незакрытая ветка означала бы «Загрузка…» навсегда.
 */
export async function bootstrapSession(): Promise<void> {
  // TEMPORARY: preview builds (VITE_PREVIEW=1) skip auth so the design can be
  // browsed without a backend while testing. Remove before real launch.
  if (import.meta.env.VITE_PREVIEW === '1') {
    enterPreviewSession();
    return;
  }
  if (!getRefreshToken()) {
    markUnauthenticated();
    return;
  }
  try {
    await refreshAccessToken();
  } catch {
    // Сюда попасть не должно — `doRefresh` ловит своё сам. Но «не должно» здесь стоило бы
    // вечной загрузки, а не строки в логе, поэтому ветка закрыта явно.
    clearSession();
  }
}
