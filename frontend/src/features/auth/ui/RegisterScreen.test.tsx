import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import { RegisterScreen } from './RegisterScreen';

describe('RegisterScreen', () => {
  it('gates a junior pupil on 152-FZ consent', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/register/:role" element={<RegisterScreen />} />
      </Routes>,
      { route: '/register/student' },
    );

    // Switch the age band to junior (7–11), then submit the empty form.
    await user.click(screen.getByRole('button', { name: '7–11 лет' }));
    await user.click(screen.getByRole('button', { name: 'Создать аккаунт' }));

    expect(
      await screen.findByText(/Без согласия мы не можем завести учётную запись/),
    ).toBeInTheDocument();
  });

  it('renders teacher-specific fields', () => {
    renderWithProviders(
      <Routes>
        <Route path="/register/:role" element={<RegisterScreen />} />
      </Routes>,
      { route: '/register/teacher' },
    );

    expect(screen.getByLabelText(/Специальность/)).toBeInTheDocument();
  });
});
