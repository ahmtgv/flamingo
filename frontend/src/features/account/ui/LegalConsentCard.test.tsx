import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MeDocument } from '@/entities/graphql/generated';
import { renderWithProviders } from '@/test/renderWithProviders';

import { LegalConsentCard } from './LegalConsentCard';

/**
 * Согласие 152-ФЗ на «Моём аккаунте» — состоянием и БЕЗ КНОПКИ (решение владельца).
 *
 * 🔴 Кнопка здесь означала бы, что подпись ставит тот, кто сидит за устройством, — то есть
 * ребёнок. Это главное, что держит эта проверка; остальное — что три состояния читаются
 * по-разному и что закрытая часть названа.
 */
function meWith(consent: Record<string, unknown>) {
  return [
    {
      request: { query: MeDocument },
      result: {
        data: {
          me: {
            __typename: 'User',
            id: 'u1',
            email: 'a@example.com',
            firstName: 'Аня',
            lastName: 'К',
            displayName: 'Аня',
            formalName: 'Аня К',
            shortName: 'Аня',
            fullName: 'К Аня',
            role: 'STUDENT',
            locale: 'ru',
            avatarUrl: null,
            consentSpeech: false,
            consentAttention: false,
            consent152fzAt: null,
            consent152fz: { __typename: 'Consent152Fz', ...consent },
            studentProfile: null,
            teacherProfile: null,
            parentProfile: null,
          },
        },
      },
    },
  ];
}

describe('согласие 152-ФЗ на «Моём аккаунте»', () => {
  it('🔴 на карточке нет ни одной кнопки — подпись не ставят с экрана аккаунта', async () => {
    renderWithProviders(<LegalConsentCard />, {
      mocks: meWith({ state: 'MISSING', at: null, byWhom: null, isSelf: false }),
      route: '/account',
    });
    const card = await screen.findByRole('region', {
      name: 'Согласие на обработку персональных данных',
    });

    expect(card.querySelectorAll('button')).toHaveLength(0);
    expect(card.querySelectorAll('input')).toHaveLength(0);
    // И сказано, почему её нет.
    expect(screen.getByText(/с экрана этого не делают/)).toBeInTheDocument();
  });

  it('дано родителем — названы кто и когда', async () => {
    renderWithProviders(<LegalConsentCard />, {
      mocks: meWith({
        state: 'GRANTED',
        at: '2026-08-01T09:00:00Z',
        byWhom: 'Мария К',
        isSelf: false,
      }),
      route: '/account',
    });
    expect(await screen.findByText(/Дано вашим родителем: Мария К/)).toBeInTheDocument();
    expect(screen.getByText(/1 августа 2026/)).toBeInTheDocument();
  });

  it('отозванное и отсутствующее читаются по-разному, а не одинаково', async () => {
    const { unmount } = renderWithProviders(<LegalConsentCard />, {
      mocks: meWith({ state: 'REVOKED', at: '2026-07-01T09:00:00Z', byWhom: null, isSelf: false }),
      route: '/account',
    });
    expect(await screen.findByText(/Отозвано/)).toBeInTheDocument();
    unmount();

    renderWithProviders(<LegalConsentCard />, {
      mocks: meWith({ state: 'MISSING', at: null, byWhom: null, isSelf: false }),
      route: '/account',
    });
    // «Нет» — не «отозвано»: это разные положения, и для подростка первое нормально.
    expect(await screen.findByText(/Согласия нет/)).toBeInTheDocument();
  });

  it('названа закрытая часть — та, которой согласие не касается вовсе', async () => {
    renderWithProviders(<LegalConsentCard />, {
      mocks: meWith({ state: 'GRANTED', at: '2026-08-01T09:00:00Z', byWhom: null, isSelf: true }),
      route: '/account',
    });
    await screen.findByText(/Дано вами/);

    // CLAUDE.md §2.1 и §2.2 — устройство продукта, а не настройка.
    expect(screen.getByText(/кадры камеры и микрофона с устройства не уходят вовсе/i)).toBeInTheDocument();
    expect(screen.getByText(/Записей занятий не существует/)).toBeInTheDocument();
  });
});
