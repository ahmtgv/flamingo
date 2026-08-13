import { type MockedResponse } from '@apollo/client/testing';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GraphQLError } from 'graphql';
import { describe, expect, it } from 'vitest';

import { RedeemProjectorCodeDocument } from '@/entities/graphql/generated';
import { renderWithProviders } from '@/test/renderWithProviders';

import { ProjectorScreen } from './ProjectorScreen';

const render = (mocks: MockedResponse[]) =>
  renderWithProviders(<ProjectorScreen />, { mocks, route: '/projector' });

describe('ProjectorScreen — the tablet on the wall', () => {
  it('asks for the code the teacher read out, and nothing else', () => {
    render([]);
    expect(screen.getByRole('heading', { name: 'Второй экран' })).toBeInTheDocument();
    expect(screen.getByLabelText('Код')).toBeInTheDocument();
    // No account, no roster, no controls — a screen is not a participant.
    expect(screen.queryByLabelText(/пароль/i)).not.toBeInTheDocument();
  });

  it('upper-cases what is typed, because the code is upper-case on the screen', async () => {
    render([]);
    const input = screen.getByLabelText('Код');
    await userEvent.type(input, 'k7m2rq');
    expect(input).toHaveValue('K7M2RQ');
  });

  it('a code that does not work says so instead of hanging', async () => {
    render([
      {
        request: { query: RedeemProjectorCodeDocument, variables: { code: 'ZZZZZZ' } },
        result: { errors: [new GraphQLError('Projector code not found')] },
      },
    ]);

    await userEvent.type(screen.getByLabelText('Код'), 'ZZZZZZ');
    await userEvent.click(screen.getByRole('button', { name: 'Подключиться' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Код не подошёл');
  });
});
