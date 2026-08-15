import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { bootstrapSession } from './refresh';
import { clearSession, getSessionSnapshot, setSession } from './session';

/**
 * 🔴 СТАРТ ОБЯЗАН ЗАКОНЧИТЬСЯ (промпт 21 §2.1).
 *
 * Находка владельца 16.08: приложение открывается и висит на «Загрузка…». Ни мастера, ни
 * ошибки. Экран показывается, пока статус `unknown`, а выйти оттуда можно только `setSession`
 * или `clearSession` — оба зовутся из `bootstrapSession()`. Оставался третий путь: **запрос
 * не возвращается вовсе.** `fetch` в `refresh.ts` шёл без таймаута и без `AbortController`.
 *
 * ⚠️ Регрессия от собственной правки. Раньше этого пути НЕ СУЩЕСТВОВАЛО: токена в приложении
 * не бывало, `bootstrapSession()` сразу звал `markUnauthenticated()`. §Б0-септ научил
 * связывание класть сессию — и приложение при каждом старте пошло обновлять её по коду,
 * который в этих условиях никогда не работал.
 *
 * Поэтому тест держит не «таймаут настроен», а **исход**: после старта статус НЕ `unknown`,
 * что бы ни сделала сеть.
 */

/**
 * Сервер, который не отвечает никогда, — но по правилам `fetch`: отменённый запрос
 * ОТКЛОНЯЕТСЯ. Первая версия этого дубля игнорировала сигнал и просто висела вечно; она
 * прошла свой тест и утекла в следующий, повалив его. Дубль, ведущий себя не как настоящий
 * `fetch`, проверяет не тот код, что работает в бою.
 */
const NEVER = (_url: string, init?: RequestInit) =>
  new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
  });

/**
 * 🔴 БЕЗ ЭТОГО ТЕСТЫ НИЖЕ ЗЕЛЕНЫ И НЕ ЗНАЧАТ НИЧЕГО.
 *
 * В этом прогоне `localStorage` НЕ СУЩЕСТВУЕТ (`typeof localStorage === 'undefined'`), а
 * `getRefreshToken()` читает именно его и молча отдаёт `null` из-под своего `catch`. Значит
 * `bootstrapSession()` уходил в ветку «токена нет» и сразу звал `markUnauthenticated()` —
 * то есть ожидаемый `unauthenticated` получался, ни разу не тронув ни `fetch`, ни таймаут.
 *
 * Поймано печатью: `ok = false, calls = 0` — сетевой дубль не звали вообще. Ровно ловушка
 * фазы: зелёный тест на пути, по которому проверяемый код не ходит.
 */
const storage = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => void storage.set(k, v),
  removeItem: (k: string) => void storage.delete(k),
  clear: () => storage.clear(),
});

beforeEach(() => {
  vi.useFakeTimers();
  storage.clear();
  clearSession();
});

afterEach(() => {
  vi.useRealTimers();
  // ⚠️ НЕ `vi.unstubAllGlobals()`: он снял бы и подставленный `localStorage`, и следующий
  // тест снова поехал бы по мёртвой ветке — молча и зелено.
  clearSession();
});

describe('загрузка при старте', () => {
  it('🔴 сервер не отвечает НИКОГДА — экран всё равно выходит из загрузки', async () => {
    // Ровно состояние 16.08: сессия есть (её положило связывание), сервер молчит.
    setSession('access', 'refresh-от-связывания');
    const fetchSpy = vi.fn(NEVER);
    vi.stubGlobal('fetch', fetchSpy as unknown as typeof fetch);

    const booting = bootstrapSession();
    await vi.advanceTimersByTimeAsync(11_000);
    await booting;

    // Сначала — что мы вообще проверили ТОТ путь. Без этой строки «unauthenticated» получается
    // и когда запрос не отправляли: именно так первая версия теста и была зелёной.
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(getSessionSnapshot().status).not.toBe('unknown');
    expect(getSessionSnapshot().status).toBe('unauthenticated');
  });

  it('сеть отказала сразу — тот же исход, без ожидания', async () => {
    setSession('access', 'refresh-от-связывания');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('нет сети')));

    await bootstrapSession();

    expect(getSessionSnapshot().status).toBe('unauthenticated');
  });

  it('сервер ответил мусором — тоже завершаемся, а не висим', async () => {
    setSession('access', 'refresh-от-связывания');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ json: () => Promise.resolve({ data: null }) } as Response),
    );

    await bootstrapSession();

    expect(getSessionSnapshot().status).toBe('unauthenticated');
  });

  it('сервер обновил сессию — входим', async () => {
    setSession('старый', 'refresh-от-связывания');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () =>
          Promise.resolve({ data: { refreshToken: { token: 'новый', refreshToken: 'r2' } } }),
      } as Response),
    );

    await bootstrapSession();

    expect(getSessionSnapshot().status).toBe('authenticated');
  });

  it('токена нет вовсе — сразу аноним, без запроса', async () => {
    const fetchSpy = vi.fn(NEVER);
    vi.stubGlobal('fetch', fetchSpy);

    await bootstrapSession();

    expect(getSessionSnapshot().status).toBe('unauthenticated');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
