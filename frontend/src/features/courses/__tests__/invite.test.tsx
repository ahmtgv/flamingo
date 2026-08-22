import { GraphQLError } from 'graphql';
import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  CourseAudienceDocument,
  CourseInviteDocument,
  RedeemCourseInviteDocument,
} from '@/entities/graphql/generated';
import { renderWithProviders } from '@/test/renderWithProviders';

import { InviteScreen, JoinHalf } from '../ui/InviteScreen';

const COURSE = '11111111-1111-1111-1111-111111111111';

const inviteOk = {
  request: { query: CourseInviteDocument, variables: { courseId: COURSE } },
  result: { data: { courseInvite: { code: 'FLM-AB12', expiresAt: '2026-09-01T10:00:00Z', daysLeft: 7 } } },
};
const audienceOk = {
  request: { query: CourseAudienceDocument, variables: { courseId: COURSE } },
  result: {
    data: {
      courseAudience: [{ studentId: 'u-1', name: 'Аня Ковалёва', timezone: 'Europe/Moscow' }],
    },
  },
};

describe('приглашение · сторона преподавателя', () => {
  it('показывает код и того, кто уже вошёл', async () => {
    renderWithProviders(<InviteScreen />, {
      mocks: [inviteOk, audienceOk],
      route: `/courses/${COURSE}/invite`,
      path: '/courses/:courseId/invite',
    });

    expect(await screen.findByText('FLM-AB12')).toBeInTheDocument();
    expect(await screen.findByText('Аня Ковалёва')).toBeInTheDocument();
  });

  it('отказ списка не уносит с собой код — приглашение отправить всё равно можно', async () => {
    // 🔴 Пятое состояние: частичный отказ. Прежние экраны на любую ошибку гасили себя целиком,
    // и преподаватель терял код из-за того, что не пришёл СПИСОК.
    renderWithProviders(<InviteScreen />, {
      mocks: [
        inviteOk,
        {
          request: { query: CourseAudienceDocument, variables: { courseId: COURSE } },
          result: { errors: [new GraphQLError('нет связи')] },
        },
      ],
      route: `/courses/${COURSE}/invite`,
      path: '/courses/:courseId/invite',
    });

    expect(await screen.findByText('FLM-AB12')).toBeInTheDocument();
    expect(await screen.findByText(/Не видно, кто уже вошёл/)).toBeInTheDocument();
  });
});

describe('приглашение · сторона ученика', () => {
  it('код из ссылки подставлен, и после входа экран называет курс', async () => {
    renderWithProviders(<JoinHalf presetCode="FLM-AB12" />, {
      mocks: [
        {
          request: { query: RedeemCourseInviteDocument, variables: { code: 'FLM-AB12' } },
          result: { data: { redeemCourseInvite: { id: COURSE, title: 'Химия · неорганика' } } },
        },
      ],
    });

    expect(screen.getByLabelText('Код из приглашения')).toHaveValue('FLM-AB12');
    await userEvent.click(screen.getByRole('button', { name: 'Войти на курс' }));
    expect(await screen.findByText(/Вы на курсе «Химия · неорганика»/)).toBeInTheDocument();
  });

  it('отказ произносится словами сервера, а не своими', async () => {
    // Сервер различает «срок вышел», «код закрыт» и «такого кода нет»; каждый лечится
    // по-своему. Подменить их общим «не получилось» — отправить человека искать опечатку,
    // которой он не делал.
    renderWithProviders(<JoinHalf presetCode="FLM-OLD1" />, {
      mocks: [
        {
          request: { query: RedeemCourseInviteDocument, variables: { code: 'FLM-OLD1' } },
          result: { errors: [new GraphQLError('Срок кода вышел. Попросите у преподавателя новый.')] },
        },
      ],
    });

    await userEvent.click(screen.getByRole('button', { name: 'Войти на курс' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Срок кода вышел');
  });
});
