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
let refreshInFlight: Promise<RefreshOutcome> | null = null;

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

/**
 * Чем кончилась попытка обновиться. Три исхода, и путать их нельзя.
 *
 * 🔴 «СЕРВЕР НЕ ОТВЕТИЛ» И «ТЕБЯ НЕ ПРИЗНАЛИ» — РАЗНЫЕ СОБЫТИЯ (наряд 48 §1).
 *
 * Здесь стоял `boolean`, и `clearSession()` жил в хвосте — то есть срабатывал при ЛЮБОМ
 * неуспехе, включая обрыв сети и таймаут. Замерено 22.08: сервер убран на полминуты —
 * и весь класс, включая комнату урока, оказывается на форме входа; ключ обновления при
 * этом стёрт, поэтому вернувшийся сервер уже не помогает — надо вводить пароль.
 *
 * Ключ чистим ровно в одном случае: сервер ОТВЕТИЛ и сказал, что ключ недействителен.
 */
export type RefreshOutcome =
  /** Сервер выдал новую пару — сессия жива. */
  | 'refreshed'
  /** Сервер ответил и отказал: ключ недействителен. Только здесь чистим. */
  | 'rejected'
  /** Сервера нет: сеть, таймаут, 502. Ключ трогать нельзя — он, скорее всего, в порядке. */
  | 'unreachable';

/** Ответил ли сервер «этот ключ недействителен», а не «мне сейчас плохо». */
function saysKeyIsDead(status: number, json: { errors?: { message?: string }[] } | null): boolean {
  // 5xx — это про сервер, а не про ключ. 4xx с внятным отказом — про ключ.
  if (status >= 500) return false;
  const messages = (json?.errors ?? []).map((e) => String(e?.message ?? ''));
  if (messages.some((m) => /invalid|expired|revoked|not found|недейств|истёк|отозв/i.test(m)))
    return true;
  // Ответ 200 с `data.refreshToken === null` и без ошибок — сервер отработал и не признал ключ.
  return status >= 200 && status < 500 && (json?.errors ?? []).length === 0;
}

async function doRefresh(): Promise<RefreshOutcome> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return 'rejected';
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
    let json: {
      data?: { refreshToken?: { token: string; refreshToken: string } | null };
      errors?: { message?: string }[];
    } | null = null;
    try {
      json = await res.json();
    } catch {
      // Ответ есть, но это не наш JSON: прокси отдал страницу ошибки. Сервер, а не ключ.
      return 'unreachable';
    }
    const payload = json?.data?.refreshToken;
    if (payload?.token) {
      setSession(payload.token, payload.refreshToken);
      return 'refreshed';
    }
    if (saysKeyIsDead(res.status, json)) {
      clearSession();
      return 'rejected';
    }
    return 'unreachable';
  } catch {
    // Сеть отказала или вышел таймаут. Сессию НЕ трогаем: через минуту сервер вернётся,
    // и урок продолжится без единого пароля.
    return 'unreachable';
  } finally {
    clearTimeout(timer);
  }
}

export function refreshAccessToken(): Promise<RefreshOutcome> {
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
  let outcome: RefreshOutcome = 'unreachable';
  try {
    outcome = await refreshAccessToken();
  } catch {
    // Сюда попасть не должно — `doRefresh` ловит своё сам. Но «не должно» здесь стоило бы
    // вечной загрузки, а не строки в логе, поэтому ветка закрыта явно.
    outcome = 'unreachable';
  }
  if (outcome === 'refreshed') return;
  /*
   * 🔴 Сервера нет — это НЕ «выйди и введи пароль».
   *
   * Экран не должен висеть на «Загрузка…», поэтому статус разрешаем в «не вошёл». Но ключ
   * обновления остаётся на месте, и мы продолжаем тихо стучаться: вернулся сервер — сессия
   * восстановилась сама, человек ничего не заметил. Так ведёт себя связь, а не забор.
   */
  if (outcome === 'unreachable') {
    markUnauthenticated();
    void keepTrying();
    return;
  }
  markUnauthenticated();
}

/** Сколько раз и через сколько стучаться, пока сервер не вернётся. */
const RETRY_DELAYS_MS = [3_000, 5_000, 10_000, 20_000, 30_000];

async function keepTrying(): Promise<void> {
  for (const delay of RETRY_DELAYS_MS) {
    await new Promise((r) => setTimeout(r, delay));
    if (!getRefreshToken()) return; // человек вышел сам — больше не наше дело
    const outcome = await refreshAccessToken();
    if (outcome !== 'unreachable') return; // вернулись или получили честный отказ
  }
}
