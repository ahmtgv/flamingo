import { describe, expect, it } from 'vitest';

import { isOwnPath, returnTo, withReturnTo } from './returnTo';

/**
 * Адрес возврата после входа и регистрации (OWNER_SCOPE §26.4).
 *
 * Приложение присылает преподавателя на `/link?code=…` регистрироваться. Без возврата он после
 * регистрации оказывался на стартовой и шёл к приложению переписывать шесть знаков руками —
 * ровно то, ради устранения чего кнопка «Создать учётку» и заводилась.
 */

describe('куда возвращать', () => {
  it('свой путь возвращается целиком, вместе с кодом', () => {
    expect(returnTo('?next=%2Flink%3Fcode%3DE24NBK')).toBe('/link?code=E24NBK');
  });

  it('без параметра — некуда, и это не ошибка', () => {
    expect(returnTo('')).toBeNull();
    expect(returnTo('?other=1')).toBeNull();
  });
});

describe('🔒 возврат только на свой путь', () => {
  it('чужой сайт не подставляется', () => {
    // Открытая переадресация: форма входа превратилась бы в трамплин на чужую страницу.
    expect(returnTo('?next=https%3A%2F%2Fexample.com')).toBeNull();
    expect(returnTo('?next=http%3A%2F%2Fexample.com')).toBeNull();
  });

  it('«//host» и «/\\host» — тоже наружу, одного слэша мало', () => {
    // Браузер читает их как ссылку на другой хост, хотя строка начинается со слэша.
    expect(isOwnPath('//example.com')).toBe(false);
    expect(isOwnPath('/\\example.com')).toBe(false);
    expect(returnTo('?next=%2F%2Fexample.com')).toBeNull();
  });

  it('обычный путь — свой', () => {
    expect(isOwnPath('/link?code=E24NBK')).toBe(true);
    expect(isOwnPath('/start')).toBe(true);
  });
});

describe('как адрес приклеивается', () => {
  it('путь входа несёт назначение', () => {
    expect(withReturnTo('/login', '/link?code=E24NBK')).toBe(
      '/login?next=%2Flink%3Fcode%3DE24NBK',
    );
  });

  it('чужое назначение не приклеивается вовсе', () => {
    expect(withReturnTo('/login', 'https://example.com')).toBe('/login');
    expect(withReturnTo('/login', '')).toBe('/login');
  });

  it('туда и обратно — та же строка', () => {
    const target = '/link?code=FFAQDJ';
    const url = new URL(withReturnTo('/register/teacher', target), 'https://flamingo.plus');
    expect(returnTo(url.search)).toBe(target);
  });
});
