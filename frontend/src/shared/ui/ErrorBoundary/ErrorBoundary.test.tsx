import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import { ErrorBoundary } from './ErrorBoundary';

function Boom(): never {
  throw new Error('kaboom');
}

describe('ErrorBoundary', () => {
  // React logs caught render errors to console.error — silence it for a clean test run.
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => undefined));
  afterEach(() => vi.restoreAllMocks());

  it('renders children when there is no error', () => {
    renderWithProviders(
      <ErrorBoundary>
        <p>всё хорошо</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('всё хорошо')).toBeInTheDocument();
  });

  it('shows the calm crash fallback (role=alert + atlas copy + recovery actions) on a render error', () => {
    renderWithProviders(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Что-то сломалось у нас');
    // 🔴 T-08: экран обещал «уже знаем и чиним», а ErrorBoundary только писал в консоль —
    // никто не знал. Теперь он говорит правду и просит написать нам.
    expect(alert).toHaveTextContent('данные при этом целы');
    expect(alert).toHaveTextContent('сами мы об этой поломке не узнаем');
    expect(screen.getByRole('button', { name: 'Обновить' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'На главную' })).toBeInTheDocument();
  });
});
