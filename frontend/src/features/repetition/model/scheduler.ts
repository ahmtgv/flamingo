import { type Card, createEmptyCard, fsrs, generatorParameters, Rating, State } from 'ts-fsrs';

import type { CardState, ReviewRating } from '@/entities/graphql/generated';

/**
 * The FSRS bridge (R4.4 — spec §7.3 names `ts-fsrs`, MIT; deliberately NOT SM-2).
 *
 * Scheduling runs here, on the device, and the server records the result. That is also where
 * the product is heading: the desktop-host decision moves computation to the learner's
 * machine and leaves the server holding the record.
 *
 * This module is pure — no Apollo, no React, no clock of its own beyond the `now` it is
 * handed. That is what makes the scheduling testable without a browser, which matters for
 * the one thing nobody can eyeball: whether a wrong answer really does bring a word back
 * sooner than a right one.
 */

/** Fuzz off: two learners answering identically should get identical schedules, and a test
 *  that has to allow for randomness stops being a test. */
const PARAMS = generatorParameters({ enable_fuzz: false });
const ENGINE = fsrs(PARAMS);

/** The version stamped on a card, so a future re-fit is a bump and not a silent change. */
export const PARAMS_VERSION = 'fsrs-v1';

/** What the server stores, in the shape the mutation takes. */
export interface Schedule {
  stability: number;
  difficulty: number;
  dueAt: string;
  state: CardState;
  learningSteps: number;
}

/** What we hold about a card between reviews — the server's `DueCard`, narrowed. */
export interface CardSnapshot {
  state: CardState;
  stability: number;
  difficulty: number;
  dueAt: string;
  lastReviewAt?: string | null;
  reps: number;
  lapses: number;
  learningSteps: number;
}

const TO_FSRS_STATE: Record<CardState, State> = {
  NEW: State.New,
  LEARNING: State.Learning,
  REVIEW: State.Review,
  RELEARNING: State.Relearning,
};

const FROM_FSRS_STATE: Record<number, CardState> = {
  [State.New]: 'NEW',
  [State.Learning]: 'LEARNING',
  [State.Review]: 'REVIEW',
  [State.Relearning]: 'RELEARNING',
};

/** Only the four gradeable ratings — `Manual` exists in the library and is not a grade. */
type Grade = Rating.Again | Rating.Hard | Rating.Good | Rating.Easy;

const TO_FSRS_RATING: Record<ReviewRating, Grade> = {
  AGAIN: Rating.Again,
  HARD: Rating.Hard,
  GOOD: Rating.Good,
  EASY: Rating.Easy,
};

/** The four buttons, in the order a person reads them. */
export const RATINGS: ReviewRating[] = ['AGAIN', 'HARD', 'GOOD', 'EASY'];

/**
 * FSRS memory state is a PAIR: stability without difficulty is not a state the algorithm can
 * read back, and handing it one throws. A card can arrive that way from anywhere — an older
 * row, a server clamp, a partial cache write — and when it does, the honest recovery is to
 * treat the word as new rather than to take the whole review screen down with it. Losing one
 * card's schedule costs a learner a few extra repetitions; a crash costs them the session.
 */
function isCoherent(snapshot: CardSnapshot): boolean {
  const started = snapshot.stability > 0;
  return started === snapshot.difficulty > 0;
}

function toFsrs(snapshot: CardSnapshot, now: Date): Card {
  const empty = createEmptyCard(now);
  if (!isCoherent(snapshot)) return empty;
  return {
    ...empty,
    due: new Date(snapshot.dueAt),
    stability: snapshot.stability,
    difficulty: snapshot.difficulty,
    state: TO_FSRS_STATE[snapshot.state],
    reps: snapshot.reps,
    lapses: snapshot.lapses,
    learning_steps: snapshot.learningSteps,
    last_review: snapshot.lastReviewAt ? new Date(snapshot.lastReviewAt) : undefined,
  };
}

/** Schedule the next showing of this card for this answer. */
export function schedule(
  snapshot: CardSnapshot,
  rating: ReviewRating,
  now: Date = new Date(),
): Schedule {
  const next = ENGINE.repeat(toFsrs(snapshot, now), now)[TO_FSRS_RATING[rating]].card;
  return {
    stability: next.stability,
    difficulty: next.difficulty,
    dueAt: next.due.toISOString(),
    state: FROM_FSRS_STATE[next.state] ?? 'LEARNING',
    learningSteps: next.learning_steps ?? 0,
  };
}

/** How long until this card comes back, for the label on the button. Minutes, then days. */
export function intervalMinutes(
  snapshot: CardSnapshot,
  rating: ReviewRating,
  now: Date = new Date(),
): number {
  const next = schedule(snapshot, rating, now);
  return Math.max(0, Math.round((new Date(next.dueAt).getTime() - now.getTime()) / 60_000));
}
