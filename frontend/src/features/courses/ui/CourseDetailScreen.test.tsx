import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import {
  CourseDetailDocument,
  MeDocument,
  ReorderSectionsDocument,
} from '@/entities/graphql/generated';
import { renderWithProviders } from '@/test/renderWithProviders';

import { CourseDetailScreen } from './CourseDetailScreen';

const teacherMe = {
  request: { query: MeDocument, variables: {} },
  result: {
    data: {
      me: {
        __typename: 'User',
        id: 't1',
        email: 't@example.com',
        firstName: 'Тимур',
        lastName: 'Учитель',
        role: 'TEACHER',
        locale: 'ru',
        avatarUrl: null,
        studentProfile: null,
        teacherProfile: {
          __typename: 'TeacherProfile',
          verificationStatus: 'VERIFIED',
          specialty: 'Математика',
        },
        parentProfile: null,
      },
    },
  },
};

const course = {
  __typename: 'Course',
  id: 'c1',
  title: 'Алгебра',
  description: 'Описание',
  subject: 'Математика',
  level: 'GRADE_7',
  status: 'PUBLISHED',
  lessonCount: 0,
  enrollmentCount: 0,
  owner: {
    __typename: 'TeacherProfile',
    specialty: 'Математика',
    user: { __typename: 'User', id: 't1', firstName: 'Тимур', lastName: 'Учитель' },
  },
  sections: [
    { __typename: 'Section', id: 's1', title: 'Раздел 1', description: '', order: 0, lessons: [] },
    { __typename: 'Section', id: 's2', title: 'Раздел 2', description: '', order: 1, lessons: [] },
  ],
  viewerEnrollment: null,
};
const courseDetailMock = () => ({
  request: { query: CourseDetailDocument, variables: { id: 'c1' } },
  result: { data: { course } },
});

describe('CourseDetailScreen (owner constructor)', () => {
  it('reorders a section and opens the edit-course form', async () => {
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

    renderWithProviders(
      <Routes>
        <Route path="/courses/:id" element={<CourseDetailScreen />} />
      </Routes>,
      {
        mocks: [teacherMe, courseDetailMock(), reorderMock, courseDetailMock()],
        route: '/courses/c1',
      },
    );

    // Owner view rendered: sections + reorder controls are present.
    expect(await screen.findByText('Раздел 1')).toBeInTheDocument();
    const downButtons = screen.getAllByLabelText('Ниже'); // one per section
    await user.click(downButtons[0]); // move the first section down

    // The reorderSections mutation fired with the swapped order.
    await waitFor(() => expect(reordered).toBe(true));

    // The edit-course form opens.
    await user.click(screen.getByRole('button', { name: 'Редактировать курс' }));
    expect(await screen.findByRole('button', { name: 'Сохранить' })).toBeInTheDocument();
  });
});
