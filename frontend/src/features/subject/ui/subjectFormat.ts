/**
 * Pure helpers for the subject cabinet (atlas sheet 01).
 *
 * Deterministic given an explicit `now`, so they can be unit-tested without freezing the
 * clock. No wording inside — each returns data (a bucket name, a formatted time, a formatted
 * date) and the component turns it into Russian through i18n.
 */

export type WhenBucket = 'today' | 'yesterday' | 'date';

export interface WhenParts {
  bucket: WhenBucket;
  /** Local wall-clock time, e.g. "10:15". */
  time: string;
  /** Short day, e.g. "чт, 14 авг". */
  date: string;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Which day a lesson sits on relative to `now`, plus both formats the row may need. */
export function whenParts(iso: string, now: Date): WhenParts {
  const at = new Date(iso);
  const days = Math.round((startOfDay(at) - startOfDay(now)) / 86_400_000);
  const time = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(at);
  const date = new Intl.DateTimeFormat('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(at);
  const bucket: WhenBucket = days === 0 ? 'today' : days === -1 ? 'yesterday' : 'date';
  return { bucket, time, date };
}
