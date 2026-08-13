import { type MockedResponse } from '@apollo/client/testing';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  MyAchievementsDocument,
  MyRepetitionProgressDocument,
  MyRepetitionQueueDocument,
  type MyRepetitionQueueQuery,
  ReviewWordDocument,
} from '@/entities/graphql/generated';
import { renderWithProviders } from '@/test/renderWithProviders';

import { RepetitionScreen } from './RepetitionScreen';

type Card = MyRepetitionQueueQuery['myRepetitionQueue'][number];

const credit = {
  __typename: 'Attribution' as const,
  source: 'WORDNET' as const,
  license: 'CC BY 4.0',
  attribution: 'Princeton WordNet · Open English WordNet team',
  sourceUrl: 'https://en-word.net/',
};

const card = (over: Partial<Card> & { id: string }): Card => ({
  __typename: 'DueCard',
  direction: 'RECOGNITION',
  state: 'NEW',
  stability: 0,
  difficulty: 0,
  dueAt: new Date().toISOString(),
  lastReviewAt: null,
  reps: 0,
  lapses: 0,
  learningSteps: 0,
  item: {
    __typename: 'LexicalItem',
    id: 'lx-1',
    lemma: 'crossroads',
    pos: 'NOUN',
    ipa: '/ˈkrɒs.rəʊdz/',
    definitionRu: 'место, где пересекаются две дороги',
    translationRu: 'перекрёсток',
    credit,
    examples: [],
  },
  ...over,
});

const queueMock = (cards: Card[]): MockedResponse => ({
  request: { query: MyRepetitionQueueDocument, variables: { limit: 20 } },
  result: { data: { myRepetitionQueue: cards } },
});

const progressMock = (over: Record<string, number> = {}): MockedResponse => ({
  request: { query: MyRepetitionProgressDocument, variables: {} },
  result: {
    data: {
      myRepetitionProgress: {
        __typename: 'RepetitionProgress',
        total: 12,
        due: 3,
        learning: 2,
        mastered: 1,
        reviews: 40,
        currentStreak: 2,
        longestStreak: 9,
        ...over,
      },
    },
  },
});

const badgesMock = (keys: string[] = []): MockedResponse => ({
  request: { query: MyAchievementsDocument, variables: {} },
  result: {
    data: {
      myAchievements: keys.map((key) => ({
        __typename: 'Achievement',
        key,
        earnedAt: new Date().toISOString(),
      })),
    },
  },
});

const render = (mocks: MockedResponse[]) => renderWithProviders(<RepetitionScreen />, { mocks });

describe('RepetitionScreen — the run', () => {
  it('hides the answer until the learner has tried to remember it', async () => {
    render([queueMock([card({ id: 'c-1' })]), progressMock(), badgesMock()]);

    expect(await screen.findByText('crossroads')).toBeInTheDocument();
    expect(screen.queryByText('перекрёсток')).not.toBeInTheDocument();
    expect(screen.getByText('вспомните перевод')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Показать ответ' }));
    expect(screen.getByText('перекрёсток')).toBeInTheDocument();
  });

  it('every grade says when the word will come back — that is what the four mean', async () => {
    render([queueMock([card({ id: 'c-1' })]), progressMock(), badgesMock()]);
    await userEvent.click(await screen.findByRole('button', { name: 'Показать ответ' }));

    const grades = screen.getByRole('group', { name: 'Как вспомнилось' });
    for (const label of ['Забыл', 'С трудом', 'Вспомнил', 'Легко']) {
      expect(grades).toHaveTextContent(label);
    }
    expect(grades.textContent).toMatch(/через/);
  });

  it('sends the schedule it computed, and moves on', async () => {
    let sent: Record<string, unknown> | null = null;
    render([
      queueMock([
        card({ id: 'c-1' }),
        card({ id: 'c-2', item: { ...card({ id: 'x' }).item, id: 'lx-2', lemma: 'ahead' } }),
      ]),
      progressMock(),
      badgesMock(),
      {
        request: { query: ReviewWordDocument },
        variableMatcher: (vars: Record<string, unknown>) => {
          sent = vars;
          return true;
        },
        result: {
          data: {
            reviewWord: {
              __typename: 'DueCard',
              id: 'c-1',
              direction: 'RECOGNITION',
              state: 'LEARNING',
              stability: 2.3,
              difficulty: 5.1,
              dueAt: new Date().toISOString(),
              lastReviewAt: new Date().toISOString(),
              reps: 1,
              lapses: 0,
              learningSteps: 1,
            },
          },
        },
      },
      progressMock({ due: 2 }),
      badgesMock(['FIRST_WORD']),
    ]);

    await userEvent.click(await screen.findByRole('button', { name: 'Показать ответ' }));
    await userEvent.click(screen.getByRole('button', { name: /Вспомнил/ }));

    expect(sent).toMatchObject({ cardId: 'c-1', rating: 'GOOD' });
    expect(typeof sent!.stability).toBe('number');
    expect(typeof sent!.difficulty).toBe('number');
    // The next card is face-down again — the answer must not carry over.
    expect(await screen.findByText('ahead')).toBeInTheDocument();
    expect(screen.getByText('вспомните перевод')).toBeInTheDocument();
  });

  it('an empty queue says so instead of showing a blank card', async () => {
    render([queueMock([]), progressMock({ due: 0 }), badgesMock()]);
    expect(await screen.findByText('Сейчас повторять нечего')).toBeInTheDocument();
    expect(screen.getByText(/из уроков и из словаря/)).toBeInTheDocument();
  });
});

describe('RepetitionScreen — 🔴 only compared with who they were', () => {
  it('shows the learner their own numbers and their own record', async () => {
    render([queueMock([card({ id: 'c-1' })]), progressMock(), badgesMock()]);

    expect(await screen.findByText('к повторению')).toBeInTheDocument();
    expect(screen.getByText('дней подряд')).toBeInTheDocument();
    expect(screen.getByText('ваш рекорд — 9 дней')).toBeInTheDocument();
  });

  it('names no other learner, no rank and no place', () => {
    // The owner rule as a source assertion: there is no wording here that could compare one
    // child with another, and no query in the file that could supply the data for it.
    const here = dirname(fileURLToPath(import.meta.url));
    const screenSource = readFileSync(join(here, 'RepetitionScreen.tsx'), 'utf8');
    const opsSource = readFileSync(
      join(here, '..', 'graphql', 'repetition.graphql'),
      'utf8',
    ).toLowerCase();

    for (const smell of ['leaderboard', 'rank', 'place', 'classmates', 'topLearners']) {
      expect(screenSource.toLowerCase()).not.toContain(smell.toLowerCase());
    }
    for (const smell of ['leaderboard', 'studentid', 'userid', 'ranking']) {
      expect(opsSource).not.toContain(smell);
    }
  });

  it('shows earned milestones, all of which are the learner’s own history', async () => {
    render([
      queueMock([card({ id: 'c-1' })]),
      progressMock(),
      badgesMock(['FIRST_WORD', 'STREAK_3']),
    ]);
    expect(await screen.findByText('первое слово')).toBeInTheDocument();
    expect(screen.getByText('три дня подряд')).toBeInTheDocument();
  });
});

describe('RepetitionScreen — the licence follows the word here too', () => {
  it('prints the credit under the revealed card', async () => {
    render([queueMock([card({ id: 'c-1' })]), progressMock(), badgesMock()]);
    await userEvent.click(await screen.findByRole('button', { name: 'Показать ответ' }));
    expect(
      screen.getByText(/CC BY 4\.0 · Princeton WordNet · Open English WordNet team/),
    ).toBeInTheDocument();
  });
});
