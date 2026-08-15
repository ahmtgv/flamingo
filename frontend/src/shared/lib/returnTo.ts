/**
 * Куда вернуть человека после входа или регистрации.
 *
 * 🔴 Заведено 15.08 (OWNER_SCOPE §26.4). Приложение отправляет незалогиненного преподавателя
 * на `/link?code=…` — регистрироваться. Маршрут под `ProtectedRoute`, поэтому его уносило на
 * вход, а после регистрации он оказывался на стартовой: **адрес назначения не переживал
 * регистрацию**, и человек возвращался к приложению переписывать шесть знаков руками. Ровно то,
 * ради устранения чего кнопка и заводилась.
 *
 * 🔒 Возврат разрешён ТОЛЬКО на свой же путь: строка обязана начинаться с одного `/`. Иначе
 * `?next=https://чужой.сайт` превращает нашу форму входа в трамплин на чужую страницу —
 * классическая открытая переадресация, и стоит она одну проверку.
 */

/** Имя параметра — одно на весь продукт, чтобы вход и регистрация не разошлись. */
export const RETURN_PARAM = 'next';

/** Безопасный адрес возврата из строки запроса, либо `null`. */
export function returnTo(search: string): string | null {
  const raw = new URLSearchParams(search).get(RETURN_PARAM);
  return isOwnPath(raw) ? raw : null;
}

/**
 * Свой ли это путь. `//host` и `/\host` браузер читает как ссылку НАРУЖУ, поэтому одного
 * ведущего слэша мало — второй символ обязан быть обычным.
 */
export function isOwnPath(value: string | null | undefined): value is string {
  if (!value || !value.startsWith('/')) return false;
  return !(value.startsWith('//') || value.startsWith('/\\'));
}

/** Приклеить адрес возврата к пути входа/регистрации. */
export function withReturnTo(path: string, current: string): string {
  if (!isOwnPath(current)) return path;
  return `${path}?${RETURN_PARAM}=${encodeURIComponent(current)}`;
}
