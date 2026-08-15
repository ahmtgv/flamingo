import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { CompleteDeviceSetupDocument } from '@/entities/graphql/generated';
import { clearSession, getSessionSnapshot, setSession } from '@/shared/lib/session';
import { renderWithProviders } from '@/test/renderWithProviders';

import { DoneStep } from './DoneStep';

/**
 * 🔴 МАСТЕР ПРОЙДЕН — И ЕСТЬ КУДА ИДТИ (промпт 18 §Б0-септ).
 *
 * Находка владельца 15.08, вечер: все пять шагов зелёные, «Приложение настроено», нажатие
 * «Открыть кабинет» **не делает ничего** и ошибки не показывает. Причина одна на три симптома:
 * кабинет стоит за пользовательской сессией, а у приложения был только ключ машины. `/start`
 * под `ProtectedRoute` отправлял обратно в `/setup` — круг замкнулся, и он молчаливый.
 *
 * ⚠️ Правило, которое этот дефект породил: **переход, который никуда не привёл, — это молчащая
 * кнопка.** Правило §Б0-тер («нажатие обязано сказать причину») распространяется на навигацию:
 * если после действия экран не сменился, человек обязан узнать почему.
 *
 * Тест держит именно это — ПОВЕДЕНИЕ на выходе из мастера, а не наличие токена в ответе
 * сервера. Токен в ответе есть и в сломанной версии; чего в ней нет — так это перехода.
 */

afterEach(() => clearSession());

const renderDone = (onOpenCabinet: () => void) =>
  renderWithProviders(
    <DoneStep
      teacherName="Ирина Петровна"
      attentionOn
      groupSize={8}
      onOpenCabinet={onOpenCabinet}
    />,
    { mocks: [{ request: { query: CompleteDeviceSetupDocument, variables: {} }, result: { data: { completeDeviceSetup: true } } }], route: '/setup' },
  );

const finishButton = () => screen.getByRole('button', { name: /Открыть кабинет|Готово|Начать/ });

describe('выход из мастера', () => {
  it('🔴 с сессией «Открыть кабинет» действительно открывает кабинет', async () => {
    // Так теперь и бывает: связывание положило сессию преподавателя, подтвердившего код.
    setSession('access-от-связывания', 'refresh-от-связывания');
    let opened = false;
    renderDone(() => (opened = true));

    await userEvent.click(finishButton());

    await waitFor(() => expect(opened).toBe(true));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('🔴 без сессии переход НЕ делается молча — человек узнаёт причину', async () => {
    // Ровно состояние 15.08: мутация проходит, идти некуда. Раньше это выглядело как
    // «кнопка не работает»; теперь экран называет причину, а не отправляет по кругу.
    let opened = false;
    renderDone(() => (opened = true));

    await userEvent.click(finishButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(/сессия не получена/i);
    expect(opened).toBe(false);
  });

  it('имя, которого нет, названо словами, а не пустотой в предложении', async () => {
    // Симптом того же дефекта: «Вход выполнен — .» — точка на месте человека. Пустая строка
    // выглядит как оформление и весь вечер прятала, что `me` вообще не отвечает.
    setSession('a', 'r');
    renderWithProviders(
      <DoneStep teacherName={null} attentionOn groupSize={8} onOpenCabinet={() => {}} />,
      { mocks: [], route: '/setup' },
    );

    expect(screen.getByText(/имя не пришло/i)).toBeInTheDocument();
    expect(screen.queryByText(/Вход выполнен — \./)).not.toBeInTheDocument();
  });

  it('состояние внимания показывается настоящее, а не «выключено» по умолчанию', async () => {
    // Третий симптом: `me?.consentAttention ?? false` при неотвечающем `me` рисовал
    // «выключен» на включённом анализе — то есть врал о согласии.
    setSession('a', 'r');
    renderWithProviders(
      <DoneStep teacherName="Ирина" attentionOn groupSize={8} onOpenCabinet={() => {}} />,
      { mocks: [], route: '/setup' },
    );

    expect(screen.getByText(/анализ внимания включ/i)).toBeInTheDocument();
  });

  it('сессия из связывания хранится там же, где браузерная', () => {
    // Приложение не заводит своего хранилища: обновление обычным `refresh` работает потому,
    // что токены лежат ровно там, где их ищет весь остальной продукт.
    setSession('access-от-связывания', 'refresh-от-связывания');

    expect(getSessionSnapshot().status).toBe('authenticated');
  });
});
