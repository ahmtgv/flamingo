import { failureKind, type FailureKind } from '@/shared/lib/requestFailure';

/**
 * Почему шаг мастера не прошёл — словами, одинаковыми на всех пяти шагах.
 *
 * 🔴 Находка владельца 15.08: на шаге 2 кнопка «Дальше» нажималась и не делала НИЧЕГО — ни
 * перехода, ни ошибки. Мутация падала, `try/catch` не было, экран молчал. Тот же дефект, что
 * чинился на шаге 1, и в четырёх экземплярах: шаги 2, 3, 4 и «Готово» были написаны одинаково.
 *
 * Поэтому текст здесь один на всех, а не по строке в каждом файле: пятый шаг, написанный
 * завтра, возьмёт готовое, и «молча ничего» не вернётся тем же путём.
 */
export const STEP_FAILURE_TEXT: Record<FailureKind, string> = {
  unreachable: 'setup.failed.offline',
  rejected: 'setup.failed.refused',
  unknown: 'setup.failed.unknown',
};

/** Ключ строки для показа. `null` — ошибки нет. */
export function stepFailureKey(error: unknown): string {
  return STEP_FAILURE_TEXT[failureKind(error)];
}
