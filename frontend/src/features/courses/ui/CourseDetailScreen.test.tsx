import { type MockedResponse } from '@apollo/client/testing';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import {
  CourseDetailDocument,
  type CourseDetailQuery,
  MeDocument,
  ReorderSectionsDocument,
} from '@/entities/graphql/generated';
import { renderWithProviders } from '@/test/renderWithProviders';

import { CourseDetailScreen } from './CourseDetailScreen';

const me = (id: string, role: 'TEACHER' | 'STUDENT') => ({
  request: { query: MeDocument, variables: {} },
  result: {
    data: {
      me: {
        __typename: 'User',
        id,
        email: 'x@example.com',
        firstName: 'Имя',
        lastName: 'Фамилия',
        role,
        locale: 'ru',
        avatarUrl: null,
        studentProfile: null,
        teacherProfile: { __typename: 'TeacherProfile', verificationStatus: 'APPROVED', specialty: 'М' },
        parentProfile: null,
      },
    },
  },
});

const lesson = (id: string, status: 'PUBLISHED' | 'DRAFT' = 'PUBLISHED', order = 1) => ({
  __typename: 'Lesson' as const,
  id,
  title: `Урок ${id}`,
  durationMin: 45,
  status,
  order,
  options: { __typename: 'LessonOptions' as const, homework: false },
  materials: [],
});
const section = (id: string, title: string, lessons: ReturnType<typeof lesson>[], order = 1) => ({
  __typename: 'Section' as const,
  id,
  title,
  description: '',
  order,
  lessons,
});

function course(over: Partial<NonNullable<CourseDetailQuery['course']>> = {}): CourseDetailQuery {
  return {
    __typename: 'Query',
    course: {
      __typename: 'Course',
      id: 'c1',
      title: 'Алгебра',
      description: 'Описание курса',
      subject: 'Математика',
      level: 'GRADE_7',
      status: 'PUBLISHED',
      lessonCount: 3,
      enrollmentCount: 18,
      updatedAt: '2026-07-23T10:00:00.000Z',
      owner: {
        __typename: 'TeacherProfile',
        specialty: 'Математика',
        user: { __typename: 'User', id: 't1', firstName: 'Мария', lastName: 'Петровна' },
      },
      sections: [section('s1', 'Линейные уравнения', [lesson('l1'), lesson('l2')])],
      viewerEnrollment: null,
      ...over,
    },
  };
}
const detailMock = (data: CourseDetailQuery) => ({
  request: { query: CourseDetailDocument, variables: { id: 'c1' } },
  result: { data },
});

function render(mocks: MockedResponse[]) {
  renderWithProviders(
    <Routes>
      <Route path="/courses/:id" element={<CourseDetailScreen />} />
    </Routes>,
    { mocks, route: '/courses/c1' },
  );
}

describe('CourseDetailScreen — atlas 04 projections', () => {
  it('guest: shows the program locked "после записи" + one coral "Записаться"', async () => {
    render([me('s1', 'STUDENT'), detailMock(course({ viewerEnrollment: null }))]);
    expect(await screen.findByText('Линейные уравнения')).toBeInTheDocument();
    expect(screen.getAllByText('после записи').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Записаться на курс' })).toBeInTheDocument();
    // no owner controls leak to a guest
    expect(screen.queryByRole('button', { name: 'Редактировать описание' })).not.toBeInTheDocument();
  });

  it('enrolled: sequential program with "Продолжить" on the in-progress section', async () => {
    const data = course({
      viewerEnrollment: {
        __typename: 'Enrollment',
        id: 'e1',
        status: 'ACTIVE',
        progressPct: 66,
        viewedLessonIds: ['l1', 'l2'],
      },
      sections: [
        section('s1', 'Линейные уравнения', [lesson('l1'), lesson('l2')], 1),
        section('s2', 'Системы уравнений', [lesson('l3')], 2),
      ],
    });
    render([me('s1', 'STUDENT'), detailMock(data)]);
    // "Программа · 2 из 3 пройдено"
    expect(await screen.findByText(/2 из 3 пройдено/)).toBeInTheDocument();
    expect(screen.getByText('раздел пройден')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Продолжить' })).toBeInTheDocument();
  });

  it('owner: constructor headrow (unpublish) + editable section, reorder fires', async () => {
    const user = userEvent.setup();
    let reordered = false;
    const reorderMock = {
      request: { query: ReorderSectionsDocument, variables: { courseId: 'c1', orderedIds: ['s2', 's1'] } },
      result: () => {
        reordered = true;
        return {
          data: {
            reorderSections: [
              { __typename: 'Section', id: 's2', order: 0 },
              { __typename: 'Section', id: 's1', order: 1 },
            ],
          },
        };
      },
    };
    const data = course({
      sections: [section('s1', 'Раздел 1', [], 1), section('s2', 'Раздел 2', [], 2)],
    });
    render([me('t1', 'TEACHER'), detailMock(data), reorderMock, detailMock(data)]);

    // Owner headrow: published course → "Снять с публикации"; numbered section heading.
    expect(await screen.findByText('Раздел 01 · Раздел 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Снять с публикации' })).toBeInTheDocument();

    await user.click(screen.getAllByLabelText('Ниже')[0]); // move first section down
    await waitFor(() => expect(reordered).toBe(true));

    // Edit-description opens the form (its save is neutral, not a second coral).
    await user.click(screen.getByRole('button', { name: 'Редактировать описание' }));
    expect(await screen.findByRole('button', { name: 'Сохранить' })).toBeInTheDocument();
  });
});
