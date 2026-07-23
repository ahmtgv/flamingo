import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MeDocument } from '@/entities/graphql/generated';
import { renderWithProviders } from '@/test/renderWithProviders';

import { Cabinet } from './Cabinet';

describe('Cabinet — resilience (B-states-2)', () => {
  it('shows a retryable error instead of bouncing to /login on a transient me error', async () => {
    renderWithProviders(<Cabinet />, {
      mocks: [{ request: { query: MeDocument }, error: new Error('network down') }],
      route: '/app',
    });
    // The alert (error state) proves we did NOT Navigate away to /login.
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeInTheDocument();
  });
});
