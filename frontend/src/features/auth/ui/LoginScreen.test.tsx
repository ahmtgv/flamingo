import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import { LoginScreen } from './LoginScreen';

describe('LoginScreen', () => {
  it('shows validation errors when submitting empty', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginScreen />, { route: '/login' });

    await user.click(screen.getByRole('button', { name: 'Войти' }));

    expect(await screen.findByText('Укажите почту')).toBeInTheDocument();
    expect(screen.getByText('Придумайте пароль')).toBeInTheDocument();
  });

  it('rejects a malformed email', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginScreen />, { route: '/login' });

    await user.type(screen.getByLabelText(/Почта/), 'not-an-email');
    await user.type(screen.getByLabelText(/Пароль/), 'password123');
    await user.click(screen.getByRole('button', { name: 'Войти' }));

    expect(await screen.findByText('Проверьте адрес')).toBeInTheDocument();
  });
});
