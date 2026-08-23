import { MockedProvider } from '@apollo/client/testing';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it } from 'vitest';

import { AppRouter } from '@/app/router';
import { store } from '@/app/store';
import i18n from '@/i18n';
import { clearSession, setSession } from '@/shared/lib/session';

/**
 * 🔴 ИЗ ЭКРАНА ДОЛЖЕН БЫТЬ ВЫХОД — КАКОЙ ИМЕННО, ПРОВЕРКА НЕ ЗНАЕТ (наряд 49 §2).
 *
 * Владелец нашёл руками: `SettingsScreen` не импортировал роутер вовсе — ни кнопки назад,
 * ни крестика, ни Escape, — а единственная дверь в раме (шестерня) вела на тот же экран.
 * Выйти можно было только закрыв приложение.
 *
 * Проверка нарочно не знает про конкретную кнопку: она ищет ЛЮБОЙ выход. Иначе завтра
 * кнопку переименуют, караул останется зелёным, а человек — запертым.
 */
function openAt(url: string) {
  window.history.replaceState({}, '', url);
  return render(
    <MockedProvider mocks={[]}>
      <Provider store={store}>
        <I18nextProvider i18n={i18n}>
          <AppRouter />
        </I18nextProvider>
      </Provider>
    </MockedProvider>,
  );
}

afterEach(() => {
  clearSession();
  window.history.replaceState({}, '', '/');
});

/** Ушли ли мы с экрана — по адресу, а не по тому, что нарисовано. */
async function leftBy(action: () => Promise<void>, from: string) {
  await action();
  await waitFor(() => expect(window.location.pathname).not.toBe(from));
}

describe('тупиков нет', () => {
  it('из «Настроек» уводит кнопка выхода — любая, какая там есть', async () => {
    setSession('t', 'r');
    openAt('/settings');

    const back = await screen.findByRole('button', { name: /назад|выйти|в кабинет|закрыть/i });
    await leftBy(async () => {
      await userEvent.click(back);
    }, '/settings');
  });

  it('из «Настроек» уводит и Escape', async () => {
    setSession('t', 'r');
    /*
     * История заводится явно: пришли откуда-то и открыли настройки. Иначе `navigate(-1)`
     * уносит в накопленную историю прошлых проверок, и «ушли» становится случайным —
     * первая версия этой проверки краснела именно от этого, а не от продукта.
     */
    window.history.replaceState({}, '', '/start');
    window.history.pushState({}, '', '/settings');
    openAt('/settings');
    await screen.findByRole('button', { name: /назад|выйти|в кабинет|закрыть/i });

    const { fireEvent } = await import('@testing-library/react');
    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => expect(window.location.pathname).toBe('/start'), { timeout: 3000 });
  });
});
