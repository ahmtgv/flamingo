import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import { OfflineScreen } from './OfflineScreen';

describe('экран «нет сети» (лист D1)', () => {
  it('🔴 говорит, что данные в целости', () => {
    // The teacher's laptop is the only copy of the pupils' work (OWNER_SCOPE §18). At the
    // moment the network drops, this is the sentence the person in front of it needs.
    renderWithProviders(<OfflineScreen />);
    expect(
      screen.getByText('Работы, оценки и материалы на этом компьютере — в целости'),
    ).toBeInTheDocument();
  });

  it('главное сообщение — не «ошибка»', () => {
    renderWithProviders(<OfflineScreen />);
    const card = screen.getByRole('status');
    expect(card.textContent).not.toMatch(/ошибка|сбой|не удалось/i);
  });

  it('говорит, что работать можно и без сети', () => {
    renderWithProviders(<OfflineScreen />);
    expect(screen.getByText(/Можно продолжать проверять работы/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Проверять работы офлайн' })).toBeInTheDocument();
  });

  it('обещает, что всё продолжится с того же места', () => {
    renderWithProviders(<OfflineScreen />);
    expect(screen.getByText(/продолжится с того же места/)).toBeInTheDocument();
  });
});
