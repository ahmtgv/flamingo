/**
 * Дверь группы — правила, общие для панели преподавателя и для ссылки (лист D3).
 *
 * Вынесено из компонента, потому что адрес двери собирают в трёх местах: панель показывает
 * его, «Скопировать» кладёт в буфер, QR кодирует. Три сборки одной строки — три способа
 * однажды разойтись, и разойдутся они на ученике, у которого ссылка не откроется.
 */

/** Порядок как на листе: сначала обычный режим школьной группы, потом послабления. */
export const MEETING_MODES = ['GROUP_ONLY', 'ANY_AUTHENTICATED', 'KNOCK'] as const;
export type MeetingMode = (typeof MEETING_MODES)[number];

/**
 * 🔴 По умолчанию — «только ученики этой группы» (решение владельца 14.08, п.1).
 *
 * Посторонний со ссылкой не войдёт, свои заходят без стука. Режим с подтверждением остаётся
 * переключателем для открытых занятий, а не общим правилом.
 */
export const DEFAULT_MEETING_MODE: MeetingMode = 'GROUP_ONLY';

/**
 * Адрес двери. Кириллический путь `/к/` — тот, что напечатан на листе; latin `/j/` работает
 * тоже (оба маршрута заведены), но человеку показываем ровно то, что он потом прочитает вслух.
 */
export function joinUrl(slug: string, origin?: string): string {
  const base = origin ?? (typeof window === 'undefined' ? '' : window.location.origin);
  return `${base}/к/${slug}`;
}

/**
 * Когда человек открывал дверь — так, как это читают глазами.
 *
 * Сегодня — время («вошла в 17:52»), раньше — дата. Лист пишет «приглашение открыто вчера», и
 * это не украшение: «21:28» у того, кто заходил три дня назад, читается как «только что», и
 * преподаватель решит, что человек стоит за дверью прямо сейчас.
 */
export function whenOpened(iso: string, now: Date = new Date()): string {
  const at = new Date(iso);
  const sameDay =
    at.getFullYear() === now.getFullYear() &&
    at.getMonth() === now.getMonth() &&
    at.getDate() === now.getDate();
  return sameDay
    ? at.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
    : at.toLocaleDateString('ru', { day: 'numeric', month: 'long' });
}
