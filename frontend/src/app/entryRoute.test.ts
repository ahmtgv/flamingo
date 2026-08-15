import { afterEach, describe, expect, it } from 'vitest';

import { entryRoute } from './entryRoute';

/** §19.4 — приложение никогда не спрашивает пароль. Проверяется правилом, а не осмотром. */

function pretendDesktop(on: boolean) {
  const w = window as unknown as { __TAURI_INTERNALS__?: unknown };
  if (on) w.__TAURI_INTERNALS__ = { invoke: () => Promise.resolve() };
  else delete w.__TAURI_INTERNALS__;
}

afterEach(() => pretendDesktop(false));

describe('первая дверь для невошедшего', () => {
  it('в браузере — форма входа: там она и должна быть', () => {
    pretendDesktop(false);
    expect(entryRoute()).toBe('/login');
  });

  it('🔴 в приложении — мастер первого запуска, а не форма пароля', () => {
    // Свежая установка открывалась на /login с полем пароля — прямо против §19.4.
    pretendDesktop(true);
    expect(entryRoute()).toBe('/setup');
  });
});
