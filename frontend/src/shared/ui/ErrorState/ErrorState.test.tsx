import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import { ErrorState } from './ErrorState';

describe('ErrorState', () => {
  it('announces an error and calls onRetry when the retry button is pressed', async () => {
    const onRetry = vi.fn();
    renderWithProviders(<ErrorState onRetry={onRetry} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Что-то пошло не так');
    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('omits the retry button when no onRetry is given', () => {
    renderWithProviders(<ErrorState />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
