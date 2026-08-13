import { type MockedResponse } from '@apollo/client/testing';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import {
  AssembleLessonSummaryDocument,
  LessonSummaryDocument,
  type LessonSummaryQuery,
  SendLessonSummaryDocument,
  UpdateSummaryItemDocument,
} from '@/entities/graphql/generated';
import { renderWithProviders } from '@/test/renderWithProviders';

import { SummaryScene } from './SummaryScene';

const SESSION = 'ses-1';

type Summary = NonNullable<LessonSummaryQuery['lessonSummary']>;
type Item = Summary['items'][number];

const item = (over: Partial<Item> & { id: string }): Item => ({
  __typename: 'SummaryItem',
  section: 'TOPIC',
  source: 'PLAN',
  sourceMeta: {},
  atOffsetSec: 0,
  text: 'Разогрев',
  authorId: null,
  authorName: '',
  dueAt: null,
  homeworkId: null,
  edited: false,
  ...over,
});

const summaryMock = (over: Partial<Summary> = {}): MockedResponse => ({
  request: { query: LessonSummaryDocument, variables: { sessionId: SESSION } },
  result: {
    data: {
      lessonSummary: {
        __typename: 'LessonSummary',
        id: 'sum-1',
        sessionId: SESSION,
        status: 'DRAFT',
        intro: '',
        assembledAt: new Date().toISOString(),
        sentAt: null,
        speechOmitted: false,
        canEdit: true,
        items: [item({ id: 'i-1' })],
        ...over,
      },
    },
  },
});

const emptyMock = (): MockedResponse => ({
  request: { query: LessonSummaryDocument, variables: { sessionId: SESSION } },
  result: { data: { lessonSummary: null } },
});

const render = (mocks: MockedResponse[], isTeacher = true) =>
  renderWithProviders(<SummaryScene sessionId={SESSION} isTeacher={isTeacher} />, { mocks });

describe('SummaryScene — what the sheet promises out loud', () => {
  it('says on its face that audio and video are not kept and the summary is', async () => {
    render([summaryMock()]);
    expect(await screen.findByText(/аудио и видео не записываются/)).toBeInTheDocument();
    expect(screen.getByText(/сохраняется и у преподавателя, и у участников/)).toBeInTheDocument();
  });

  it('is a draft until it is sent, and says which one it is', async () => {
    render([summaryMock()]);
    expect(await screen.findByText(/черновик · собрано автоматически/)).toBeInTheDocument();
  });

  it('shows the sections of the sheet, in its order', async () => {
    render([
      summaryMock({
        items: [
          item({ id: 'i-1', section: 'TOPIC' }),
          item({ id: 'i-2', section: 'CHAT', source: 'CHAT', text: 'а go straight on?' }),
          item({ id: 'i-3', section: 'HOMEWORK', source: 'TEACHER', text: 'Описать дорогу' }),
        ],
      }),
    ]);

    const headings = await screen.findAllByRole('heading', { level: 4 });
    expect(headings.map((h) => h.textContent)).toEqual(['О чём был урок', 'Чат занятия', 'Задано']);
  });

  it('the lesson chat is a SECTION of the summary, not a link to somewhere else', async () => {
    render([
      summaryMock({
        items: [item({ id: 'i-2', section: 'CHAT', source: 'CHAT', text: 'вопрос по доске' })],
      }),
    ]);
    expect(await screen.findByRole('heading', { name: 'Чат занятия' })).toBeInTheDocument();
    expect(screen.getByText('вопрос по доске')).toBeInTheDocument();
  });
});

describe('SummaryScene — provenance under every line', () => {
  it('composes the caption on the client, from source + sourceMeta', async () => {
    render([
      summaryMock({
        items: [
          item({
            id: 'i-1',
            source: 'BOARD',
            sourceMeta: { elements: 4, authorName: 'Петя' },
            text: 'Три конструкции вопроса',
          }),
          item({
            id: 'i-2',
            source: 'TEST',
            sourceMeta: { answered: 5, correct: 4, groupSize: 6 },
            text: 'Быстрый тест',
          }),
        ],
      }),
    ]);

    expect(await screen.findByText(/с доски · 4 объекта · Петя/)).toBeInTheDocument();
    expect(screen.getByText(/ответили 5 из 6, верно 4/)).toBeInTheDocument();
  });

  it('a speech line says the recording was never made', async () => {
    render([
      summaryMock({
        items: [item({ id: 'i-1', source: 'SPEECH', text: 'на экзамене пишите ahead' })],
      }),
    ]);
    expect(await screen.findByText(/запись не велась/)).toBeInTheDocument();
  });

  it('the moment column reads as a clock', async () => {
    render([summaryMock({ items: [item({ id: 'i-1', atOffsetSec: 665 })] })]);
    expect(await screen.findByText('11:05')).toBeInTheDocument();
  });
});

describe('SummaryScene — the teacher edits, then sends', () => {
  it('rewriting a line sends the new text', async () => {
    let sent: unknown = null;
    render([
      summaryMock(),
      {
        request: {
          query: UpdateSummaryItemDocument,
          variables: { itemId: 'i-1', text: 'Разогрев, своими словами' },
        },
        result: () => {
          sent = 'Разогрев, своими словами';
          return {
            data: {
              updateSummaryItem: {
                __typename: 'SummaryItem',
                id: 'i-1',
                text: 'Разогрев, своими словами',
                edited: true,
              },
            },
          };
        },
      },
      summaryMock(),
    ]);

    await userEvent.click(await screen.findByRole('button', { name: 'править' }));
    const field = screen.getByRole('textbox', { name: 'Текст пункта саммари' });
    await userEvent.clear(field);
    await userEvent.type(field, 'Разогрев, своими словами');
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(sent).toBe('Разогрев, своими словами');
  });

  it('offers «отправить группе» while it is a draft', async () => {
    render([summaryMock()]);
    expect(await screen.findByRole('button', { name: 'Отправить группе' })).toBeInTheDocument();
  });

  it('a sent summary offers no editing at all', async () => {
    render([summaryMock({ status: 'SENT', canEdit: false, sentAt: new Date().toISOString() })]);
    expect(await screen.findByText('отправлено группе')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Отправить группе' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'править' })).not.toBeInTheDocument();
  });

  it('sending calls the mutation', async () => {
    let sent = false;
    render([
      summaryMock(),
      {
        request: { query: SendLessonSummaryDocument, variables: { sessionId: SESSION } },
        result: () => {
          sent = true;
          return {
            data: {
              sendLessonSummary: {
                __typename: 'LessonSummary',
                id: 'sum-1',
                status: 'SENT',
                sentAt: new Date().toISOString(),
              },
            },
          };
        },
      },
      summaryMock({ status: 'SENT', canEdit: false }),
    ]);

    await userEvent.click(await screen.findByRole('button', { name: 'Отправить группе' }));
    expect(sent).toBe(true);
  });
});

describe('SummaryScene — the states that carry a rule', () => {
  it('a learner whose summary has not been sent is told nothing about it', async () => {
    // Not an error and not «нет доступа»: whether the teacher has started writing is not
    // the learner's business either.
    render([emptyMock()], false);
    expect(await screen.findByText('Саммари этого занятия пока нет.')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('the teacher of an unassembled lesson is offered the button that makes one', async () => {
    let assembled = false;
    render([
      emptyMock(),
      {
        request: { query: AssembleLessonSummaryDocument, variables: { sessionId: SESSION } },
        result: () => {
          assembled = true;
          return {
            data: {
              assembleLessonSummary: {
                __typename: 'LessonSummary',
                id: 'sum-1',
                status: 'DRAFT',
                speechOmitted: false,
                assembledAt: new Date().toISOString(),
                canEdit: true,
                items: [],
              },
            },
          };
        },
      },
      summaryMock(),
    ]);

    await userEvent.click(await screen.findByRole('button', { name: 'Собрать саммари сейчас' }));
    expect(assembled).toBe(true);
  });

  it('says plainly when speech points were left out, instead of a quietly thinner summary', async () => {
    render([summaryMock({ speechOmitted: true })]);
    expect(await screen.findByText(/Пункты из речи в это саммари не вошли/)).toBeInTheDocument();
  });

  it('a failed load reports as a status, not as an alert over the lesson', async () => {
    renderWithProviders(<SummaryScene sessionId={SESSION} isTeacher />, {
      mocks: [
        {
          request: { query: LessonSummaryDocument, variables: { sessionId: SESSION } },
          error: new Error('network down'),
        },
      ],
    });
    expect(await screen.findByRole('status')).toHaveTextContent(/Не получилось загрузить саммари/);
  });
});
