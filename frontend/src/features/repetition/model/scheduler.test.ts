import { describe, expect, it } from 'vitest';

import { type CardSnapshot, intervalMinutes, RATINGS, schedule } from './scheduler';

/**
 * FSRS, not SM-2 (spec §7.3). These tests pin the properties a person would notice if they
 * broke — not the library's arithmetic, which is not ours to assert.
 */

const NOW = new Date('2026-08-13T10:00:00.000Z');

const fresh = (over: Partial<CardSnapshot> = {}): CardSnapshot => ({
  state: 'NEW',
  stability: 0,
  difficulty: 0,
  dueAt: NOW.toISOString(),
  lastReviewAt: null,
  reps: 0,
  lapses: 0,
  learningSteps: 0,
  ...over,
});

describe('scheduler — the four grades mean four different things', () => {
  it('a harder answer brings the word back sooner', () => {
    const known = fresh({ state: 'REVIEW', stability: 10, difficulty: 5, reps: 4 });
    const intervals = RATINGS.map((r) => intervalMinutes(known, r, NOW));

    // AGAIN ≤ HARD ≤ GOOD ≤ EASY. If this ever inverts, a learner would be punished for
    // remembering — and nobody would spot it by looking at the screen.
    expect(intervals[0]).toBeLessThanOrEqual(intervals[1]);
    expect(intervals[1]).toBeLessThanOrEqual(intervals[2]);
    expect(intervals[2]).toBeLessThanOrEqual(intervals[3]);
  });

  it('forgetting a well-known word sends it back to relearning', () => {
    const known = fresh({ state: 'REVIEW', stability: 40, difficulty: 5, reps: 9 });
    expect(schedule(known, 'AGAIN', NOW).state).toBe('RELEARNING');
  });

  it('a new word does not jump straight to a long interval', () => {
    // The whole point of the learning steps: a word met once is not a word learned.
    expect(intervalMinutes(fresh(), 'GOOD', NOW)).toBeLessThan(60 * 24);
  });
});

describe('scheduler — the state it hands the server', () => {
  it('produces a due date in the future and a state the contract knows', () => {
    for (const rating of RATINGS) {
      const next = schedule(fresh(), rating, NOW);
      expect(new Date(next.dueAt).getTime()).toBeGreaterThanOrEqual(NOW.getTime());
      expect(['NEW', 'LEARNING', 'REVIEW', 'RELEARNING']).toContain(next.state);
      expect(Number.isFinite(next.stability)).toBe(true);
      expect(Number.isFinite(next.difficulty)).toBe(true);
    }
  });

  it('is deterministic — fuzz is off, so two identical answers schedule identically', () => {
    // A test that has to allow for randomness stops being a test, and two learners answering
    // the same way should not get different homework.
    expect(schedule(fresh(), 'GOOD', NOW)).toEqual(schedule(fresh(), 'GOOD', NOW));
  });

  it('round-trips the learning steps, so they do not silently restart', () => {
    const first = schedule(fresh(), 'GOOD', NOW);
    const second = schedule(
      fresh({
        state: first.state,
        stability: first.stability,
        difficulty: first.difficulty,
        dueAt: first.dueAt,
        learningSteps: first.learningSteps,
        reps: 1,
        lastReviewAt: NOW.toISOString(),
      }),
      'GOOD',
      new Date(first.dueAt),
    );
    expect(second.learningSteps).not.toBe(first.learningSteps);
  });

  it('stability grows as a word is remembered, which is what «выучено» is measured on', () => {
    let card = fresh();
    let at = NOW;
    const seen: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      const next = schedule(card, 'GOOD', at);
      seen.push(next.stability);
      // `lastReviewAt` is the moment of the REVIEW, not the next due date — which is exactly
      // what the server writes (`last_review_at = now`). Getting it wrong makes elapsed time
      // zero forever and stability never moves; the first version of this test did.
      card = { ...card, ...next, reps: card.reps + 1, lastReviewAt: at.toISOString() };
      at = new Date(next.dueAt);
    }
    expect(seen[seen.length - 1]).toBeGreaterThan(seen[0]);
  });
});

describe('scheduler — an incoherent card must not take the screen down', () => {
  it('treats stability-without-difficulty as a new word instead of throwing', () => {
    // FSRS memory state is a PAIR. This exact combination reached the screen once, from a
    // mutation that returned half a card, and it threw during render — so the learner lost
    // the whole session, not one word's schedule.
    const broken = fresh({ state: 'REVIEW', stability: 2.3, difficulty: 0, reps: 3 });
    expect(() => schedule(broken, 'GOOD', NOW)).not.toThrow();
    expect(schedule(broken, 'GOOD', NOW)).toEqual(schedule(fresh(), 'GOOD', NOW));
  });

  it('and the same the other way round', () => {
    const broken = fresh({ state: 'REVIEW', stability: 0, difficulty: 6, reps: 3 });
    expect(() => schedule(broken, 'AGAIN', NOW)).not.toThrow();
  });
});
