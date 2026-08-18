import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SOURCES } from '@/features/sources/catalog';
import { renderWithProviders } from '@/test/renderWithProviders';

import { LandingScreen } from './ui/LandingScreen';

/**
 * 🔴 ЧТО СТОРОЖИТСЯ ЗДЕСЬ — ПРАВА, А НЕ ВЁРСТКА (наряд 35 §3.2).
 *
 * Права проверены ревьюером 18.08: NASA можно (назвать источник, эмблему не брать); Эрмитаж —
 * условий в открытом виде нет, нужен запрос музею; Cambridge — только то, у чего своя
 * лицензия, потому что общие условия некоммерческие, а мы коммерческие; Национальный архив —
 * владелец не назвал, какой.
 *
 * Заглушка на первой странице живёт вечно, поэтому проверка простая и злая: этих имён на
 * афише быть не должно, пока право не появилось.
 */
describe('первая страница · только то, на что есть право', () => {
  it('NASA названа источником — это условие использования, а не вежливость', () => {
    renderWithProviders(<LandingScreen />, { route: '/' });
    expect(screen.getByText('NASA')).toBeTruthy();
    expect(screen.getByText(/Источник: NASA/)).toBeTruthy();
  });

  it('на афише нет ни одного источника без открытой лицензии', () => {
    /**
     * ⚠️ ПЕРВАЯ ВЕРСИЯ ЭТОЙ ПРОВЕРКИ ПРОХОДИЛА ПО СЛУЧАЙНОСТИ. Она искала на странице слово
     * «Эрмитаж» — а Эрмитаж лежит в каталоге двадцатым, и первые три записи и без фильтра
     * оказались с открытой лицензией. Я снял фильтр, тест остался зелёным: он проверял
     * порядок в файле, а не право.
     *
     * Проверка от МНОЖЕСТВА: каждое имя, попавшее на афишу, обязано быть именем источника с
     * `permission: 'reuse'`. Порядок в каталоге на это не влияет никак.
     */
    renderWithProviders(<LandingScreen />, { route: '/' });
    const allowed = new Set(
      SOURCES.filter((source) => source.permission === 'reuse').map((source) => source.org),
    );
    allowed.add('NASA'); // право проверено отдельно: материалы не защищены в США.

    const shown = screen
      .getAllByRole('listitem')
      .map((li) => li.querySelector('a')?.children[1]?.textContent ?? '')
      .filter(Boolean);

    expect(shown.length).toBeGreaterThan(0);
    for (const org of shown) expect(allowed.has(org), `${org} на афише без права`).toBe(true);
  });

  it('пустая полка говорит, что она пустая, а не изображает наполненность', () => {
    renderWithProviders(<LandingScreen />, { route: '/' });
    expect(screen.getByText(/Первые короткие видео появятся/)).toBeTruthy();
  });

  it('вход и регистрация — в верхней строке, как на листе', () => {
    renderWithProviders(<LandingScreen />, { route: '/' });
    expect(screen.getByRole('link', { name: 'Войти' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Регистрация' })).toBeTruthy();
  });
});
