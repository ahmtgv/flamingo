import { ApolloError } from '@apollo/client';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import { ErrorState } from './ErrorState';

/**
 * 🔴 ЧЕТЫРЕ ОТКАЗА — ЧЕТЫРЕ РАЗНЫХ ОТВЕТА (промпт 27 §1.1 п.4).
 *
 * Аудит по ролям 17.08: девять экранов из восемнадцати писали «Что-то пошло не так» и на
 * «сети нет», и на «сервер отказал». Человеку это две разные новости — в первом случае надо
 * включить вай-фай, во втором звонить, — и одинаковые слова отнимают у него единственную
 * подсказку.
 */
describe('экран отказа говорит, ЧТО случилось', () => {
  it('сети нет — говорит про связь', () => {
    const offline = new ApolloError({ networkError: new Error('Failed to fetch') });
    renderWithProviders(<ErrorState error={offline} />);
    expect(screen.getByRole('alert').textContent).toMatch(/связ|сет/i);
  });

  it('сервер отказал — не выдаёт это за обрыв связи', () => {
    const refused = new ApolloError({ graphQLErrors: [{ message: 'Not your session' } as never] });
    renderWithProviders(<ErrorState error={refused} />);
    const said = screen.getByRole('alert').textContent ?? '';
    expect(said).not.toMatch(/нет связи/i);
    expect(said.length).toBeGreaterThan(0);
  });

  it('🔴 два отказа звучат ПО-РАЗНОМУ', () => {
    // Страховка от зелени: обе проверки выше прошли бы и на одинаковом тексте, если бы он
    // случайно подходил под оба условия.
    const offline = new ApolloError({ networkError: new Error('Failed to fetch') });
    const refused = new ApolloError({ graphQLErrors: [{ message: 'nope' } as never] });
    const { unmount } = renderWithProviders(<ErrorState error={offline} />);
    const first = screen.getByRole('alert').textContent;
    unmount();
    renderWithProviders(<ErrorState error={refused} />);
    expect(screen.getByRole('alert').textContent).not.toBe(first);
  });

  it('ошибки не дали — остаётся общая фраза, а не пустота', () => {
    renderWithProviders(<ErrorState />);
    expect((screen.getByRole('alert').textContent ?? '').length).toBeGreaterThan(0);
  });
});
