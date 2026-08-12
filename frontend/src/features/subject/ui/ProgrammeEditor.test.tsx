import { type MockedResponse } from '@apollo/client/testing';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GraphQLError } from 'graphql';
import { describe, expect, it, vi } from 'vitest';

import {
  CreateLessonDocument,
  ReorderLessonsDocument,
  type SubjectCabinetQuery,
  UpdateLessonDocument,
} from '@/entities/graphql/generated';
import { renderWithProviders } from '@/test/renderWithProviders';

import { ProgrammeEditor } from './ProgrammeEditor';

type Section = SubjectCabinetQuery['subjectCabinet']['sections'][number];
type Lesson = Section['lessons'][number];

const lesson = (id: string, title: string, orderLabel: string): Lesson => ({
  __typename: 'SubjectLesson',
  id,
  title,
  subtitle: null,
  progress: 'AHEAD',
  kind: 'STANDARD',
  deviceKey: null,
  orderLabel,
  materialCount: 0,
  hasHomework: false,
  sessionId: null,
  sessionAt: null,
  isLive: false,
  grade: null,
  completedBy: null,
  groupSize: null,
});

const SECTION: Section = {
  __typename: 'SubjectSection',
  id: 'sec-2',
  title: 'Раздел 2',
  doneLessons: 0,
  totalLessons: 2,
  lessons: [lesson('l1', 'Как ищут планеты', '1'), lesson('l2', 'Транзитный метод', '2')],
};

const render = (mocks: MockedResponse[], onChanged = vi.fn().mockResolvedValue(undefined)) => {
  renderWithProviders(<ProgrammeEditor section={SECTION} onChanged={onChanged} />, { mocks });
  return onChanged;
};

describe('ProgrammeEditor — atlas sheet 01, owner answer 3', () => {
  it('reorders a lesson by sending the whole new order to the server', async () => {
    let sent: unknown = null;
    const onChanged = render([
      {
        request: {
          query: ReorderLessonsDocument,
          variables: { sectionId: 'sec-2', orderedIds: ['l2', 'l1'] },
        },
        result: () => {
          sent = ['l2', 'l1'];
          return {
            data: {
              reorderLessons: [
                { __typename: 'Lesson', id: 'l2', order: 1 },
                { __typename: 'Lesson', id: 'l1', order: 2 },
              ],
            },
          };
        },
      },
    ]);

    await userEvent.click(screen.getAllByRole('button', { name: 'Ниже' })[0]);
    await vi.waitFor(() => expect(sent).toEqual(['l2', 'l1']));
    expect(onChanged).toHaveBeenCalled();
  });

  it('cannot move the first lesson up or the last one down', () => {
    render([]);
    expect(screen.getAllByRole('button', { name: 'Выше' })[0]).toBeDisabled();
    expect(screen.getAllByRole('button', { name: 'Ниже' })[1]).toBeDisabled();
  });

  it('edits a lesson and can turn it into a device lesson', async () => {
    let sent: Record<string, unknown> | null = null;
    render([
      {
        request: {
          query: UpdateLessonDocument,
          variables: {
            id: 'l1',
            input: {
              title: 'Своё наблюдение',
              description: '',
              durationMin: 45,
              kind: 'EXTERNAL_DEVICE',
              deviceKey: 'microobservatory',
            },
          },
        },
        result: () => {
          sent = { kind: 'EXTERNAL_DEVICE', deviceKey: 'microobservatory' };
          return {
            data: {
              updateLesson: {
                __typename: 'Lesson',
                id: 'l1',
                title: 'Своё наблюдение',
                description: '',
                kind: 'EXTERNAL_DEVICE',
                deviceKey: 'microobservatory',
              },
            },
          };
        },
      },
    ]);

    await userEvent.click(screen.getAllByRole('button', { name: 'Править урок' })[0]);
    const title = screen.getByLabelText('Название урока');
    await userEvent.clear(title);
    await userEvent.type(title, 'Своё наблюдение');
    await userEvent.click(screen.getByLabelText(/Урок на внешнем приборе/));
    await userEvent.type(screen.getByLabelText('Ключ прибора'), 'microobservatory');
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    await vi.waitFor(() =>
      expect(sent).toEqual({ kind: 'EXTERNAL_DEVICE', deviceKey: 'microobservatory' }),
    );
  });

  it('adds a lesson to the section', async () => {
    let created = false;
    render([
      {
        request: {
          query: CreateLessonDocument,
          variables: {
            sectionId: 'sec-2',
            input: {
              title: 'Атмосферы далёких миров',
              description: '',
              durationMin: 45,
              kind: 'STANDARD',
              deviceKey: '',
            },
          },
        },
        result: () => {
          created = true;
          return {
            data: {
              createLesson: {
                __typename: 'Lesson',
                id: 'l3',
                title: 'Атмосферы далёких миров',
                status: 'DRAFT',
                kind: 'STANDARD',
                deviceKey: null,
              },
            },
          };
        },
      },
    ]);

    await userEvent.click(screen.getByRole('button', { name: '+ урок' }));
    await userEvent.type(screen.getByLabelText('Название урока'), 'Атмосферы далёких миров');
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    await vi.waitFor(() => expect(created).toBe(true));
  });

  it('a server refusal is shown, not swallowed — the client is not the authority here', async () => {
    render([
      {
        request: {
          query: ReorderLessonsDocument,
          variables: { sectionId: 'sec-2', orderedIds: ['l2', 'l1'] },
        },
        result: { errors: [new GraphQLError('Not your course')] },
      },
    ]);

    await userEvent.click(screen.getAllByRole('button', { name: 'Ниже' })[0]);
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось сохранить');
  });

  it('asks before removing a lesson, and does nothing if the answer is no', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const onChanged = render([]);

    await userEvent.click(screen.getAllByRole('button', { name: 'Удалить урок' })[0]);
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Как ищут планеты'));
    expect(onChanged).not.toHaveBeenCalled();
    confirm.mockRestore();
  });
});
