import { type ReactNode, useEffect, useSyncExternalStore } from 'react';

/**
 * 🔴 РАМА НИКОГДА НЕ УЗНАВАЛА, ЧТО ИДЁТ УРОК (найдено аудитом продукта 17.08).
 *
 * Владелец: «Десктопная версия выглядит как поломанный код». Инвентарь нашёл причину — две
 * строки в `DesktopShell`:
 *
 *     const verdict: UplinkVerdict = 'UNKNOWN';
 *     lessonLive={false}
 *
 * Захардкоженные. Через `hostState()` из них следует состояние `idle` всегда, а из `idle` —
 * что **весь лист D1 не показывается никогда**: ни полосы состояния («Связь: хорошая»,
 * «Подключено 6 из 8», «Идёт 24:16»), ни названия урока в заголовке — главной правки
 * владельца 14.08, — ни переключателей, ни кнопки «Завершить».
 *
 * То есть рама была построена целиком и подключена к константам. Каждая её функция написана,
 * протестирована (`hostState.test.ts` зелен) и недостижима: тест проверял вывод из фактов, а
 * фактов ей никто не давал. Ровно `hostHeartbeat`: резолвер, который умеет ответить, и никто
 * не спрашивает.
 *
 * Почему маячок, а не запрос. Факты урока знает комната: какой урок, сколько дошло, сколько
 * идёт. Рама стоит НАД маршрутом и не может их запросить, не заведя второй источник правды о
 * том же занятии — а два источника расходятся ровно посреди урока. Комната объявляет, рама
 * слушает. Уходит комната — маячок гаснет сам.
 */

export interface HostLesson {
  /** Название урока для заголовка окна. */
  lessonName: string;
  lessonNumber?: number;
  /** Сколько человек в группе ожидается. */
  participantCount?: number;
  /** Сколько уже подключилось: «двое не дошли, и это видно раньше, чем они напишут в чат». */
  joined?: number;
  /** Начало занятия, мс эпохи — из `startAt` сервера, а не из момента входа. */
  startedAt: number;
  /** Действия правой части полосы. D1: «"Завершить" остаётся в раме». */
  actions?: ReactNode;
}

let current: HostLesson | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Комната объявляет факты урока; `null` — урока с этой машины нет. */
export function publishHostLesson(next: HostLesson | null) {
  current = next;
  emit();
}

/** Что рама знает об уроке прямо сейчас. */
export function useHostLesson(): HostLesson | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}

/**
 * Объявлять из комнаты. Гаснет при размонтировании — иначе заголовок носил бы название урока,
 * которого уже нет, а это ровно та мебель, которую лист D1 запрещает.
 *
 * ⚠️ `lesson` пересобирается на каждый рендер комнаты, поэтому сравниваем ПОЛЯ, а не ссылку:
 * иначе `publishHostLesson` дёргал бы всех слушателей шестьдесят раз в секунду и рама
 * перерисовывалась бы поверх идущего урока.
 */
export function usePublishHostLesson(lesson: HostLesson | null) {
  const key = lesson
    ? `${lesson.lessonName}|${lesson.lessonNumber}|${lesson.participantCount}|${lesson.joined}|${lesson.startedAt}`
    : '';
  const actions = lesson?.actions;
  useEffect(() => {
    publishHostLesson(lesson);
    return () => publishHostLesson(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- см. коммент выше: сравнение по полям
  }, [key, actions]);
}

/** Сколько идёт занятие — «24:16». Обновляется раз в секунду и только пока урок идёт. */
export function elapsedSince(startedAt: number, now: number): string {
  const total = Math.max(0, Math.floor((now - startedAt) / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}
