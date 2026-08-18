import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import { NotFoundScreen } from './NotFoundScreen';

/**
 * 🔴 НЕИЗВЕСТНЫЙ АДРЕС МОЛЧА УВОДИЛ НА КОРЕНЬ (находка ревьюера Р-5, 18.08).
 *
 * Ревьюер набрал `/mylearning` вместо `/my-learning` и оказался на стартовой, не узнав, что
 * промахнулся. Человек с опечаткой решит, что «ссылка не работает».
 *
 * Молчащая переадресация — тот же молчащий отказ, из-за которого в этом продукте уже дважды
 * искали несуществующие поломки.
 */
describe('«такой страницы нет»', () => {
  it('говорит, что страницы нет, и показывает адрес целиком', () => {
    renderWithProviders(<NotFoundScreen />, { route: '/mylearning' });
    expect(screen.getByText('Такой страницы нет')).toBeTruthy();
    // Адрес нужен, чтобы человек увидел СВОЮ опечатку, а не гадал.
    expect(screen.getByText('/mylearning')).toBeTruthy();
  });

  it('даёт две двери: в кабинет и назад — экраном-тупиком не становится', () => {
    renderWithProviders(<NotFoundScreen />, { route: '/что-то' });
    expect(screen.getByRole('button', { name: 'В кабинет' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Назад' })).toBeTruthy();
  });

  it('успокаивает: ничего не потеряно', () => {
    renderWithProviders(<NotFoundScreen />, { route: '/x' });
    expect(screen.getByText(/Ничего не потеряно/)).toBeTruthy();
  });
});
