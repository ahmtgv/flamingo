import { describe, expect, it } from 'vitest';

import { countdown, daysUntil, minutesUntil, weekRange } from './startFormat';

const now = new Date('2026-08-12T09:58:00');

describe('startFormat', () => {
  it('counts down in minutes under an hour and in hours above it', () => {
    expect(countdown('2026-08-12T10:15:00', now)).toEqual({ unit: 'minutes', count: 17 });
    expect(countdown('2026-08-12T12:00:00', now)).toEqual({ unit: 'hours', count: 2 });
    // Already started: never a negative countdown.
    expect(countdown('2026-08-12T09:00:00', now)).toEqual({ unit: 'minutes', count: 0 });
  });

  it('minutesUntil goes negative once the moment has passed', () => {
    expect(minutesUntil('2026-08-12T09:48:00', now)).toBe(-10);
  });

  it('daysUntil counts calendar days, not 24-hour blocks', () => {
    // 18:00 tomorrow is "1 день", even though it is 32 hours away.
    expect(daysUntil('2026-08-13T18:00:00', now)).toBe(1);
    expect(daysUntil('2026-08-12T23:00:00', now)).toBe(0);
    expect(daysUntil('2026-08-10T10:00:00', now)).toBe(0); // overdue never shows negative
  });

  it('weekRange labels the strip from the first to the last day', () => {
    const days = [{ date: '2026-08-12' }, { date: '2026-08-13' }, { date: '2026-08-18' }];
    expect(weekRange(days)).toEqual({ from: '12', to: '18 августа' });
    expect(weekRange([])).toEqual({ from: '', to: '' });
  });
});
