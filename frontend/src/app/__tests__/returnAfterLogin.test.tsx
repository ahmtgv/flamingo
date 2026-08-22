import { MockedProvider } from '@apollo/client/testing';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it } from 'vitest';

import { AppRouter } from '@/app/router';
import { store } from '@/app/store';
import i18n from '@/i18n';
import { clearSession, setSession } from '@/shared/lib/session';

/**
 * 🔴 АДРЕС НАЗНАЧЕНИЯ ОБЯЗАН ПЕРЕЖИТЬ ВХОД.
 *
 * Найдено замером 22.08 на пути постороннего: человек открывает `/join/FLM-…` из мессенджера,
 * жмёт «войти», входит — и оказывается на `/start`, в пустом кабинете, без единого слова про
 * курс, куда его звали. Ссылку второй раз не открывают.
 *
 * Виновата была не форма входа (она честно звала `navigate(back)`), а охрана открытых
 * экранов: увидев вошедшего на `/login`, она уносила его на `/start` раньше, чем срабатывал
 * возврат. Поэтому проверяем не форму, а ИСХОД: где человек оказался.
 */
function renderAt(url: string) {
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

describe('возврат после входа', () => {
  it('вошедшего на форме входа возвращает туда, куда его звали', async () => {
    setSession('t', 'r');
    renderAt('/login?next=%2Fjoin%2FFLM-TEST');

    await waitFor(() => expect(window.location.pathname).toBe('/join/FLM-TEST'));
    // Не только адрес: экран обязан назвать себя, иначе «дошли» значит лишь «сменилась строка».
    expect(await screen.findByText(/Войти по коду из приглашения/)).toBeInTheDocument();
  });

  it('без адреса назначения по-прежнему уходит на стартовую', async () => {
    // Обратная сторона: возврат не должен подменить обычный вход.
    setSession('t', 'r');
    renderAt('/login');

    await waitFor(() => expect(window.location.pathname).toBe('/start'));
  });

  it('чужой адрес в возврате не исполняется', async () => {
    setSession('t', 'r');
    renderAt('/login?next=https%3A%2F%2Fchuzhoy.example%2Fpay');

    await waitFor(() => expect(window.location.pathname).toBe('/start'));
    expect(window.location.host).not.toContain('chuzhoy');
  });
});
