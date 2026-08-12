import { describe, expect, it } from 'vitest';

import { whenParts } from './subjectFormat';

const now = new Date('2026-08-12T09:00:00');
const at = (iso: string) => whenParts(new Date(iso).toISOString(), now);

describe('whenParts — which day a lesson sits on', () => {
  it('buckets today, yesterday and any other date', () => {
    expect(at('2026-08-12T10:15:00').bucket).toBe('today');
    expect(at('2026-08-11T14:00:00').bucket).toBe('yesterday');
    expect(at('2026-08-14T14:00:00').bucket).toBe('date');
    expect(at('2026-08-05T14:00:00').bucket).toBe('date');
  });

  it('counts calendar days, not 24-hour spans', () => {
    // 23:30 yesterday is under 12 hours before `now`, yet it is still yesterday.
    expect(at('2026-08-11T23:30:00').bucket).toBe('yesterday');
    // 23:30 today is over 12 hours ahead, and still today.
    expect(at('2026-08-12T23:30:00').bucket).toBe('today');
  });

  it('carries both a clock time and a short date so the row can pick', () => {
    const parts = at('2026-08-12T10:15:00');
    expect(parts.time).toBe('10:15');
    expect(parts.date).toMatch(/12/);
  });
});
