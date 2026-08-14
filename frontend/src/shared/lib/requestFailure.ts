/**
 * Почему запрос не удался — по-честному (аудит 14.08: R-02, R-03, R-06).
 *
 * 🔴 Дефект, который это чинит, самый дорогой из всех текстовых. Вход говорил «Неверная почта
 * или пароль» на **любую** ошибку, включая «сервера нет». Человек, у которого пароль верный,
 * идёт его менять — и теряет доступ по-настоящему, потому что программа соврала.
 *
 * Различать «сервер не ответил» и «сервер ответил отказом» умеет сам Apollo: сетевой сбой
 * приходит как `networkError`, отказ — как `graphQLErrors`. Экраны раньше ловили `catch` целиком
 * и не смотрели внутрь.
 *
 * ⚠️ Одного здесь нет намеренно: различения «такой почты нет» и «пароль не тот». Это не
 * недосмотр, а защита от перебора — по такому ответу список почт продукта собирается
 * скриптом за вечер.
 */

export type FailureKind =
  /** Сервер не ответил: сети нет, сервер лежит, витрина собрана без демо-слоя (R-01). */
  | 'unreachable'
  /** Сервер ответил и отказал — по существу запроса. */
  | 'rejected'
  /** Ни то ни другое: неизвестное. Тоже отдельный случай, а не «наверное пароль». */
  | 'unknown';

interface ApolloLike {
  networkError?: unknown;
  graphQLErrors?: readonly unknown[];
  message?: string;
}

export function failureKind(error: unknown): FailureKind {
  const e = error as ApolloLike | null;
  if (!e) return 'unknown';
  if (e.networkError) return 'unreachable';
  if (e.graphQLErrors && e.graphQLErrors.length > 0) return 'rejected';
  return 'unknown';
}

/**
 * Текст сервера, если он есть и если он на человеческом языке.
 *
 * R-06: серверные сообщения были английские («This email is already registered»). Русские
 * пропускаем как есть — они точнее общей фразы; английские глотаем и отдаём экрану свой текст,
 * потому что английская строка посреди русской формы читается как сбой, а не как объяснение.
 */
export function serverMessage(error: unknown): string | null {
  const e = error as { graphQLErrors?: readonly { message?: string }[] } | null;
  const first = e?.graphQLErrors?.[0]?.message;
  if (!first) return null;
  return /[а-яё]/i.test(first) ? first : null;
}
