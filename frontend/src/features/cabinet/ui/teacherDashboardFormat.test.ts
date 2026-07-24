import { describe, expect, it } from 'vitest';

import { fullDaysSince, humanizeDuration, minutesUntil } from './teacherDashboardFormat';

const units = { hour: 'ч', minute: 'мин' };

describe('teacherDashboardFormat', () => {
  it('fullDaysSince floors elapsed days and never goes negative', () => {
    const now = new Date('2026-07-24T14:00:00Z');
    expect(fullDaysSince('2026-07-22T10:00:00Z', now)).toBe(2);
    expect(fullDaysSince('2026-07-24T10:00:00Z', now)).toBe(0); // same day
    expect(fullDaysSince('2026-07-25T10:00:00Z', now)).toBe(0); // future clamps to 0
  });

  it('minutesUntil rounds and clamps past instants to 0', () => {
    const now = new Date('2026-07-24T14:00:00Z');
    expect(minutesUntil('2026-07-24T16:28:00Z', now)).toBe(148);
    expect(minutesUntil('2026-07-24T13:00:00Z', now)).toBe(0);
  });

  it('humanizeDuration composes hours/minutes from caller-supplied unit labels', () => {
    expect(humanizeDuration(148, units)).toBe('2 ч 28 мин');
    expect(humanizeDuration(45, units)).toBe('45 мин');
    expect(humanizeDuration(180, units)).toBe('3 ч');
  });
});
