import { type MockedResponse } from '@apollo/client/testing';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import {
  SubjectProgressDocument,
  type SubjectProgressQuery,
  SubjectTasksDocument,
  type SubjectTasksQuery,
} from '@/entities/graphql/generated';
import { renderWithProviders } from '@/test/renderWithProviders';

import { ProgressPanel } from './ProgressPanel';
import { TasksPanel } from './TasksPanel';

const COURSE = 'c-astro';

type Task = SubjectTasksQuery['subjectTasks'][number];
type Topic = SubjectProgressQuery['subjectProgress']['topics'][number];

const task = (over: Partial<Task> & { id: string; title: string; state: Task['state'] }): Task => ({
  __typename: 'SubjectTask',
  lessonId: 'l12',
  lessonLabel: '12',
  dueAt: null,
  submittedAt: null,
  score: null,
  comment: null,
  attempts: 0,
  redoOpen: false,
  submittedBy: null,
  groupSize: null,
  gradedCount: null,
  waitingCount: null,
  staleCount: null,
  retakeCount: null,
  ...over,
});

const topic = (over: Partial<Topic> & { id: string; title: string }): Topic => ({
  __typename: 'SubjectTopic',
  lessonFrom: '10',
  lessonTo: '11',
  isCurrent: false,
  pct: null,
  previousPct: null,
  weakCount: null,
  learnerCount: null,
  ...over,
});

const tasksMock = (tasks: Task[]): MockedResponse => ({
  request: { query: SubjectTasksDocument, variables: { courseId: COURSE } },
  result: { data: { __typename: 'Query', subjectTasks: tasks } as SubjectTasksQuery },
});

const progressMock = (over: Partial<SubjectProgressQuery['subjectProgress']>): MockedResponse => ({
  request: { query: SubjectProgressDocument, variables: { courseId: COURSE } },
  result: {
    data: {
      __typename: 'Query',
      subjectProgress: {
        __typename: 'SubjectProgress',
        profileKind: 'PUPIL',
        overallPct: null,
        previousOverallPct: null,
        weakBelowPct: 60,
        topics: [],
        ...over,
      },
    } as SubjectProgressQuery,
  },
});

describe('TasksPanel — atlas sheet 01, «Задания»', () => {
  it('a graded task shows the mark and the teacher’s words with the work', async () => {
    renderWithProviders(
      <TasksPanel courseId={COURSE} isTeacher={false} teacherName="Мария Петровна" />,
      {
        mocks: [
          tasksMock([
            task({
              id: 't1',
              title: 'Кривая блеска · разбор',
              state: 'GRADED',
              score: 64,
              comment: 'Период — по двум минимумам, а не по одному',
              attempts: 1,
            }),
          ]),
        ],
      },
    );

    expect(await screen.findByText('Кривая блеска · разбор')).toBeInTheDocument();
    // Default scale is percent; the five-point reading has its own test below.
    expect(screen.getByText('64%')).toBeInTheDocument();
    expect(screen.getByText(/Период — по двум минимумам/)).toBeInTheDocument();
  });

  it('a retake shows the NEW mark and says how many attempts there were', async () => {
    renderWithProviders(
      <TasksPanel courseId={COURSE} isTeacher={false} teacherName="Мария Петровна" />,
      {
        mocks: [
          tasksMock([
            task({
              id: 't1',
              title: 'Кривая блеска',
              state: 'GRADED',
              score: 95,
              attempts: 2,
              redoOpen: true,
            }),
          ]),
        ],
      },
    );

    expect(await screen.findByText('95%')).toBeInTheDocument();
    // The earlier mark is not shown, but the row does not pretend there was only one go.
    expect(screen.getByText('2 попытки')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Пересдать' })).toBeInTheDocument();
    expect(screen.getByText('новая оценка заменит эту')).toBeInTheDocument();
  });

  it('a missed deadline reads as overdue, not as an empty row', async () => {
    renderWithProviders(<TasksPanel courseId={COURSE} isTeacher={false} teacherName={null} />, {
      mocks: [tasksMock([task({ id: 't1', title: 'Лабораторная', state: 'OVERDUE' })])],
    });

    expect(await screen.findByText(/срок прошёл/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Открыть' })).toBeInTheDocument();
  });

  it('teacher: the queue is counts, and no child is named', async () => {
    renderWithProviders(<TasksPanel courseId={COURSE} isTeacher teacherName="Мария Петровна" />, {
      mocks: [
        tasksMock([
          task({
            id: 't1',
            title: 'Лабораторная · распределение экзопланет',
            state: 'SUBMITTED',
            submittedBy: 11,
            groupSize: 24,
            gradedCount: 0,
            waitingCount: 11,
            staleCount: 7,
          }),
          task({
            id: 't2',
            title: 'Кривая блеска · разбор',
            state: 'GRADED',
            submittedBy: 24,
            groupSize: 24,
            gradedCount: 24,
            waitingCount: 0,
            retakeCount: 3,
          }),
        ]),
      ],
    });

    expect(await screen.findByText(/сдали 11 из 24/)).toBeInTheDocument();
    expect(screen.getByText(/7 работ ждут дольше двух дней/)).toBeInTheDocument();
    expect(screen.getByText(/проверено 24 из 24/)).toBeInTheDocument();
    expect(screen.getByText(/3 пересдачи/)).toBeInTheDocument();
    // Every attempt is kept; the journal is where the history is raised.
    expect(screen.getByText('история попыток в журнале')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Проверять' })).toBeInTheDocument();
  });

  it('a mark reads in the course’s own scale — one stored number, two readings', async () => {
    // Owner decision 2026-08-13: a school subject shows «4», a standalone course «80%».
    // The stored value never changes; only the reading does.
    const graded = task({ id: 't1', title: 'Кривая блеска', state: 'GRADED', score: 4 });
    renderWithProviders(
      <TasksPanel courseId={COURSE} isTeacher={false} teacherName={null} scale="FIVE_POINT" />,
      { mocks: [tasksMock([graded])] },
    );
    expect(await screen.findByText('4')).toBeInTheDocument();
    expect(screen.queryByText('4%')).not.toBeInTheDocument();
  });

  it('says so plainly when there is no work yet', async () => {
    renderWithProviders(<TasksPanel courseId={COURSE} isTeacher={false} teacherName={null} />, {
      mocks: [tasksMock([])],
    });
    expect(await screen.findByText('Заданий по предмету пока нет')).toBeInTheDocument();
  });
});

describe('ProgressPanel — atlas sheet 01, «Прогресс»', () => {
  it('shows mastery per topic, and a topic with no marks stays blank rather than zero', async () => {
    renderWithProviders(<ProgressPanel courseId={COURSE} isTeacher={false} />, {
      mocks: [
        progressMock({
          overallPct: 62,
          previousOverallPct: 55,
          topics: [
            topic({ id: 'a', title: 'Методы поиска планет', pct: 88 }),
            topic({ id: 'b', title: 'Зона обитаемости', pct: null }),
          ],
        }),
      ],
    });

    expect(await screen.findByText('88%')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    const bar = screen.getByRole('progressbar', { name: /Методы поиска планет/ });
    expect(bar).toHaveAttribute('aria-valuenow', '88');
  });

  it('compares a learner only with their own past', async () => {
    renderWithProviders(<ProgressPanel courseId={COURSE} isTeacher={false} />, {
      mocks: [
        progressMock({
          overallPct: 62,
          previousOverallPct: 55,
          topics: [topic({ id: 'a', title: 'Методы поиска планет', pct: 88 })],
        }),
      ],
    });

    expect(await screen.findByText(/было 55% — вы выросли на 7/)).toBeInTheDocument();
    expect(screen.getByText(/сравнение только с собой-прошлым/)).toBeInTheDocument();
  });

  it('draws a weak topic in grey, not red — it is not a verdict', async () => {
    renderWithProviders(<ProgressPanel courseId={COURSE} isTeacher={false} />, {
      mocks: [
        progressMock({
          weakBelowPct: 60,
          topics: [
            topic({ id: 'a', title: 'Транзитная кривая блеска', pct: 54 }),
            topic({ id: 'b', title: 'Методы поиска', pct: 88 }),
          ],
        }),
      ],
    });

    const weak = await screen.findByRole('progressbar', { name: /Транзитная кривая блеска/ });
    const strong = screen.getByRole('progressbar', { name: /Методы поиска/ });
    expect(weak).toHaveAttribute('data-weak');
    expect(strong).not.toHaveAttribute('data-weak');
  });

  it('teacher: group mastery with a count of who struggles, and the promise in writing', async () => {
    renderWithProviders(<ProgressPanel courseId={COURSE} isTeacher />, {
      mocks: [
        progressMock({
          profileKind: 'TEACHER',
          overallPct: 57,
          previousOverallPct: null,
          topics: [
            topic({
              id: 'a',
              title: 'Транзитная кривая блеска',
              pct: 57,
              weakCount: 9,
              learnerCount: 24,
            }),
            topic({
              id: 'b',
              title: 'Методы поиска планет',
              pct: 84,
              weakCount: 0,
              learnerCount: 24,
            }),
          ],
        }),
      ],
    });

    expect(await screen.findByText('9 ученикам тема даётся тяжело')).toBeInTheDocument();
    expect(screen.getByText('усвоено уверенно')).toBeInTheDocument();
    expect(
      screen.getByText(/персональных «профилей эффективности» ученика здесь нет и не будет/),
    ).toBeInTheDocument();
    // A teacher is never shown a learner's self-comparison.
    expect(screen.queryByText(/сравнение только с собой/)).not.toBeInTheDocument();
  });

  it('marks the topic being worked through', async () => {
    renderWithProviders(<ProgressPanel courseId={COURSE} isTeacher={false} />, {
      mocks: [
        progressMock({
          topics: [topic({ id: 'a', title: 'Типы экзопланет', pct: 31, isCurrent: true })],
        }),
      ],
    });

    const row = (await screen.findByText('Типы экзопланет')).closest('div');
    expect(within(row as HTMLElement).getByText('идёт сейчас')).toBeInTheDocument();
  });

  it('an empty progress tab explains itself', async () => {
    renderWithProviders(<ProgressPanel courseId={COURSE} isTeacher={false} />, {
      mocks: [progressMock({ topics: [] })],
    });
    expect(
      await screen.findByText('Пока нечего показать — усвоение появится с первыми оценками'),
    ).toBeInTheDocument();
  });
});

describe('the tabs do not leak each other’s data', () => {
  it('a learner’s task row never carries group counts', async () => {
    renderWithProviders(<TasksPanel courseId={COURSE} isTeacher={false} teacherName={null} />, {
      mocks: [
        tasksMock([
          task({ id: 't1', title: 'Лабораторная', state: 'TODO', submittedBy: 11, groupSize: 24 }),
        ]),
      ],
    });

    await screen.findByText('Лабораторная');
    expect(screen.queryByText(/сдали 11 из 24/)).not.toBeInTheDocument();
  });

  it('the teacher’s queue never shows a personal grade', async () => {
    renderWithProviders(<TasksPanel courseId={COURSE} isTeacher teacherName={null} />, {
      mocks: [
        tasksMock([
          task({
            id: 't1',
            title: 'Кривая блеска',
            state: 'GRADED',
            score: 64,
            groupSize: 24,
            gradedCount: 24,
            waitingCount: 0,
          }),
        ]),
      ],
    });

    await screen.findByText('Кривая блеска');
    expect(screen.queryByText('64')).not.toBeInTheDocument();
  });
});

describe('the panels ask for the course they were given', () => {
  it('a task list for another course is not rendered from this one’s cache', async () => {
    renderWithProviders(<TasksPanel courseId="c-other" isTeacher={false} teacherName={null} />, {
      mocks: [tasksMock([task({ id: 't1', title: 'Чужое задание', state: 'TODO' })])],
    });

    // The only mock answers courseId=c-astro; asking for c-other must not resolve to it.
    await userEvent.click(document.body);
    expect(screen.queryByText('Чужое задание')).not.toBeInTheDocument();
  });
});
