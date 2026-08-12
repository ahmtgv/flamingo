/**
 * Pure helpers for the start page (atlas sheet 00).
 *
 * Deterministic given an explicit `now`, so they can be unit-tested without freezing the
 * clock. No i18n inside — every one of these returns data (a number, a key, a formatted
 * time), and the component turns it into wording. That is what keeps the page translatable.
 */

const MS_PER_MINUTE = 60_000;

/** Whole minutes until an instant (negative once it has passed). */
export function minutesUntil(iso: string, now: Date): number {
  return Math.round((new Date(iso).getTime() - now.getTime()) / MS_PER_MINUTE);
}

/** How to word "starts in …": the unit and the count the caller should pluralise. */
export function countdown(iso: string, now: Date): { unit: 'minutes' | 'hours'; count: number } {
  const minutes = Math.max(0, minutesUntil(iso, now));
  return minutes < 60
    ? { unit: 'minutes', count: minutes }
    : { unit: 'hours', count: Math.round(minutes / 60) };
}

/** Whole days from today to a deadline: 0 = today, 1 = tomorrow (never negative). */
export function daysUntil(iso: string, now: Date): number {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = startOfDay(new Date(iso)) - startOfDay(now);
  return Math.max(0, Math.round(diff / 86_400_000));
}

/** Local wall-clock time, e.g. "10:15". */
export function clock(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso),
  );
}

/** Weekday abbreviation for the week strip, e.g. "пн". */
export function weekday(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', { weekday: 'short' }).format(new Date(iso));
}

/** Day of month as a plain number string, e.g. "12". */
export function dayNumber(iso: string): string {
  return String(new Date(iso).getDate());
}

/** The header stamp under the greeting: "вторник, 12 августа · 09:58". */
export function headerStamp(now: Date): string {
  const day = new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(now);
  return `${day} · ${clock(now.toISOString())}`;
}

/** "10 — 16 августа" for the week strip heading. */
export function weekRange(days: readonly { date: string }[]): { from: string; to: string } {
  if (days.length === 0) return { from: '', to: '' };
  const fmt = (iso: string, withMonth: boolean) =>
    new Intl.DateTimeFormat('ru-RU', withMonth ? { day: 'numeric', month: 'long' } : { day: 'numeric' })
      .format(new Date(iso));
  return { from: fmt(days[0].date, false), to: fmt(days[days.length - 1].date, true) };
}
