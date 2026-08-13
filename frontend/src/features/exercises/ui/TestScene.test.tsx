import { type MockedResponse } from '@apollo/client/testing';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import {
  AnswerExerciseDocument,
  ExerciseLivePictureDocument,
  LessonExerciseSetsDocument,
  type LessonExerciseSetsQuery,
  MyExerciseAttemptsDocument,
} from '@/entities/graphql/generated';
import { renderWithProviders } from '@/test/renderWithProviders';

import { TestScene } from './TestScene';

const LESSON = 'les-1-12';
const SET = 'set-directions';

type Set = LessonExerciseSetsQuery['lessonExerciseSets'][number];
type Exercise = Set['exercises'][number];

const exercise = (over: Partial<Exercise> & { id: string; kind: Exercise['kind'] }): Exercise => ({
  __typename: 'Exercise',
  skill: 'GRAMMAR',
  cefrLevel: 'A2',
  skillTags: [],
  prompt: { text: 'Choose the natural phrase' },
  payload: { options: ['come', 'get'] },
  points: 1,
  order: 0,
  assetId: null,
  ...over,
});

const setsMock = (over: Partial<Set> = {}): MockedResponse => ({
  request: { query: LessonExerciseSetsDocument, variables: { lessonId: LESSON } },
  result: {
    data: {
      lessonExerciseSets: [
        {
          __typename: 'ExerciseSet',
          id: SET,
          lessonId: LESSON,
          title: 'Быстрый тест · directions',
          mode: 'LIVE',
          homeworkId: null,
          exercises: [exercise({ id: 'ex-1', kind: 'CHOICE' })],
          ...over,
        },
      ],
    },
  },
});

const attemptsMock = (attempts: unknown[] = []): MockedResponse => ({
  request: { query: MyExerciseAttemptsDocument, variables: { setId: SET } },
  result: { data: { myAttempts: attempts } },
});

const pictureMock = (rows: unknown[]): MockedResponse => ({
  request: { query: ExerciseLivePictureDocument, variables: { setId: SET } },
  result: { data: { exerciseLivePicture: rows } },
});

const render = (mocks: MockedResponse[], props: Partial<Parameters<typeof TestScene>[0]> = {}) =>
  renderWithProviders(<TestScene lessonId={LESSON} isTeacher={false} {...props} />, { mocks });

describe('TestScene — the learner’s run (atlas sheet 02)', () => {
  it('shows the question, its options and how far the run has got', async () => {
    render([setsMock(), attemptsMock()]);

    expect(await screen.findByText(/Choose the natural phrase/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /come/ })).toBeInTheDocument();
    expect(screen.getByText(/Отвечено 0 из 1/)).toBeInTheDocument();
    // The sheet says so out loud: an answer is not final until the test is.
    expect(screen.getByText(/ответ можно поменять до конца теста/)).toBeInTheDocument();
  });

  it('sends the picked option as an answer', async () => {
    let sent: unknown = null;
    render([
      setsMock(),
      attemptsMock(),
      {
        request: {
          query: AnswerExerciseDocument,
          variables: { exerciseId: 'ex-1', response: { choice: 1 }, context: 'LIVE' },
        },
        result: () => {
          sent = { choice: 1 };
          return {
            data: {
              answerExercise: {
                __typename: 'Attempt',
                id: 'a1',
                exerciseId: 'ex-1',
                isCorrect: true,
                score: 1,
                createdAt: new Date().toISOString(),
              },
            },
          };
        },
      },
      attemptsMock([
        {
          __typename: 'Attempt',
          id: 'a1',
          exerciseId: 'ex-1',
          context: 'LIVE',
          isCorrect: true,
          score: 1,
          createdAt: new Date().toISOString(),
        },
      ]),
    ]);

    await userEvent.click(await screen.findByRole('button', { name: /get/ }));
    expect(sent).toEqual({ choice: 1 });
  });

  it('says which questions a machine marks and which wait for a person', async () => {
    render([
      setsMock({
        exercises: [
          exercise({ id: 'ex-1', kind: 'CHOICE' }),
          exercise({ id: 'ex-2', kind: 'WRITING', payload: {}, order: 1 }),
        ],
      }),
      attemptsMock(),
    ]);

    expect(await screen.findByText(/проверяется здесь же/)).toBeInTheDocument();
    expect(screen.getByText(/это задание проверит преподаватель/)).toBeInTheDocument();
  });

  it('repeats the privacy promise on the two kinds that touch a microphone', async () => {
    render([
      setsMock({
        exercises: [
          exercise({ id: 'ex-2', kind: 'LISTENING' }),
          exercise({ id: 'ex-3', kind: 'PRONUNCIATION', payload: {}, order: 1 }),
        ],
      }),
      attemptsMock(),
    ]);

    expect(await screen.findByText(/запись голоса не ведётся/)).toBeInTheDocument();
    expect(screen.getByText(/звук никуда не отправляется/)).toBeInTheDocument();
  });

  it('a homework set can be handed in; a live one cannot', async () => {
    render([setsMock({ mode: 'HOMEWORK', homeworkId: 'hw-1' }), attemptsMock()]);
    expect(await screen.findByRole('button', { name: 'Сдать работу' })).toBeInTheDocument();
  });
});

describe('TestScene — the teacher’s live picture', () => {
  const asTeacher = (mocks: MockedResponse[]) => render(mocks, { isTeacher: true });

  it('shows counts and a spread, and says that it is only counts', async () => {
    asTeacher([
      setsMock(),
      pictureMock([
        {
          __typename: 'ExerciseLiveRow',
          exerciseId: 'ex-1',
          answered: 5,
          groupSize: 6,
          correct: 4,
          spread: { '0': 1, '1': 4 },
        },
      ]),
    ]);

    expect(await screen.findByText(/ответили 5 из 6/)).toBeInTheDocument();
    expect(screen.getByText(/верно 4/)).toBeInTheDocument();
    expect(screen.getByText(/кто именно — не показываем/)).toBeInTheDocument();
  });

  it('draws the histogram from the spread, one bar per option', async () => {
    asTeacher([
      setsMock(),
      pictureMock([
        {
          __typename: 'ExerciseLiveRow',
          exerciseId: 'ex-1',
          answered: 5,
          groupSize: 6,
          correct: 4,
          spread: { '0': 1, '1': 4 },
        },
      ]),
    ]);

    expect(await screen.findByRole('img', { name: /come — 1/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /get — 4/ })).toBeInTheDocument();
  });

  it('never offers the learner’s answer controls to the teacher', async () => {
    asTeacher([setsMock(), pictureMock([])]);

    await screen.findByText(/Choose the natural phrase/);
    expect(screen.queryByRole('button', { name: /come/ })).not.toBeInTheDocument();
    expect(screen.getByText('Пока никто не ответил')).toBeInTheDocument();
  });

  it('explains WHY classwork cannot be counted yet, instead of a button that does nothing', async () => {
    // countLiveAsClasswork writes a row in the journal, so the set needs a homework to write
    // it against. Leaving the teacher to discover that from a dead button is the small
    // cruelty this note exists to prevent.
    asTeacher([setsMock({ mode: 'LIVE', homeworkId: null }), pictureMock([])]);

    expect(await screen.findByText(/к набору нужна привязанная домашка/)).toBeInTheDocument();
  });

  it('offers to count classwork once the set has a homework behind it', async () => {
    asTeacher([setsMock({ mode: 'LIVE', homeworkId: 'hw-1' }), pictureMock([])]);

    expect(await screen.findByText('Зачесть как работу на уроке')).toBeInTheDocument();
    expect(screen.queryByText(/нужна привязанная домашка/)).not.toBeInTheDocument();
  });
});

describe('TestScene — states', () => {
  it('says plainly when a lesson has no test', async () => {
    render([
      {
        request: { query: LessonExerciseSetsDocument, variables: { lessonId: LESSON } },
        result: { data: { lessonExerciseSets: [] } },
      },
    ]);
    expect(await screen.findByText('К этому уроку теста пока нет')).toBeInTheDocument();
  });

  it('a failed load reports as a status, not as an alert over the lesson', async () => {
    render([
      {
        request: { query: LessonExerciseSetsDocument, variables: { lessonId: LESSON } },
        error: new Error('network down'),
      },
    ]);
    const status = await screen.findByRole('status');
    expect(within(status).getByText(/Не получилось загрузить тест/)).toBeInTheDocument();
  });
});
