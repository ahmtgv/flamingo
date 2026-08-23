import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { refreshAccessToken } from './refresh';
import { clearSession, getRefreshToken, getSessionSnapshot, setSession } from './session';

/**
 * 🔴 МОРГАНИЕ СЕРВЕРА — НЕ ВЫХОД ИЗ ПРОДУКТА (наряд 48 §1).
 *
 * Замерено 22.08: сервер убран на полминуты — тринадцать экранов подряд, включая комнату
 * урока, отдали `/login`; ключ обновления при этом стёрт, и вернувшийся сервер уже не
 * помогает: нужен пароль. Причина — `clearSession()` в хвосте `doRefresh`, срабатывавший
 * при любом неуспехе.
 *
 * Проверяем ровно различение: «сервер молчит» против «сервер сказал, что ключ мёртв».
 */
function answer(body: unknown, status = 200) {
  return vi.fn(async () => ({ status, json: async () => body }) as unknown as Response);
}

/*
 * ⚠️ jsdom здесь живёт на «пустом» происхождении, и `localStorage` в нём бросает — молча,
 * потому что `session.ts` ловит это сам. Проверка про ключ обновления без хранилища
 * проверяла бы пустоту, поэтому кладём своё, самое простое.
 */
beforeEach(() => {
  const box = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => box.get(k) ?? null,
    setItem: (k: string, v: string) => void box.set(k, v),
    removeItem: (k: string) => void box.delete(k),
  });
  setSession('acc-1', 'ref-1');
});
afterEach(() => {
  clearSession();
  vi.unstubAllGlobals();
});

describe('обновление сессии', () => {
  it('сервер не ответил — сессия и ключ остаются на месте', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));

    await expect(refreshAccessToken()).resolves.toBe('unreachable');

    expect(getRefreshToken()).toBe('ref-1');
    expect(getSessionSnapshot().status).toBe('authenticated');
  });

  it('сервер отдал 502 — это про сервер, а не про ключ', async () => {
    vi.stubGlobal('fetch', answer({ errors: [{ message: 'Bad gateway' }] }, 502));

    await expect(refreshAccessToken()).resolves.toBe('unreachable');

    expect(getRefreshToken()).toBe('ref-1');
  });

  it('прокси отдал не JSON — тоже сервер', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      status: 200,
      json: async () => { throw new SyntaxError('Unexpected token <'); },
    }) as unknown as Response));

    await expect(refreshAccessToken()).resolves.toBe('unreachable');

    expect(getRefreshToken()).toBe('ref-1');
  });

  it('сервер сказал «ключ недействителен» — только тогда чистим', async () => {
    vi.stubGlobal('fetch', answer({ errors: [{ message: 'Invalid refresh token' }] }, 200));

    await expect(refreshAccessToken()).resolves.toBe('rejected');

    expect(getRefreshToken()).toBeNull();
    expect(getSessionSnapshot().status).toBe('unauthenticated');
  });

  it('сервер вернулся — сессия обновилась', async () => {
    vi.stubGlobal('fetch', answer({ data: { refreshToken: { token: 'acc-2', refreshToken: 'ref-2' } } }));

    await expect(refreshAccessToken()).resolves.toBe('refreshed');

    expect(getRefreshToken()).toBe('ref-2');
    expect(getSessionSnapshot().status).toBe('authenticated');
  });
});
