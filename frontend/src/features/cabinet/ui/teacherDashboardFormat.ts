/**
 * Pure formatting helpers for the teacher dashboard (atlas sheet 03).
 *
 * Deterministic given an explicit `now` (so they're unit-testable without freezing the
 * clock). No i18n inside — unit labels are passed in by the caller, which keeps these
 * functions locale-agnostic and honours the "no hardcoded UI strings" rule.
 */

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;

/** Whole days elapsed since an instant (>= 0; 0 = today). */
export function fullDaysSince(fromIso: string, now: Date): number {
  const ms = now.getTime() - new Date(fromIso).getTime();
  return Math.max(0, Math.floor(ms / MS_PER_DAY));
}

/** Whole minutes until a future instant (>= 0; 0 once it has passed). */
export function minutesUntil(toIso: string, now: Date): number {
  return Math.max(0, Math.round((new Date(toIso).getTime() - now.getTime()) / MS_PER_MINUTE));
}

/** "2 ч 28 мин" | "45 мин" | "3 ч" — a mono countdown built from caller-supplied unit labels. */
export function humanizeDuration(minutes: number, units: { hour: string; minute: string }): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} ${units.minute}`;
  if (m === 0) return `${h} ${units.hour}`;
  return `${h} ${units.hour} ${m} ${units.minute}`;
}

/** Local wall-clock time, e.g. "14:00". */
export function formatClock(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso),
  );
}

/** The header meta stamp, e.g. "чт · 03.07 · 14:02" (weekday · date · time). */
export function formatHeaderMeta(now: Date): string {
  const weekday = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' }).format(now);
  const date = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' }).format(now);
  const time = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(now);
  return `${weekday} · ${date} · ${time}`;
}
