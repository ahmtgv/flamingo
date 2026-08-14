import type { JoinDecision, MeetingPointQuery } from '@/entities/graphql/generated';

/**
 * Что видит человек, пришедший по ссылке — atlas D3 (Р5.6).
 *
 * Лист называет пять состояний, и одно из них — **главный экран этого листа**: «преподавателя
 * нет в сети». В десктопной архитектуре комната живёт на машине преподавателя, значит его
 * отсутствие — **штатное состояние, а не поломка**, и экран не имеет права выглядеть ошибкой.
 *
 * Решение о состоянии вынесено сюда, а не разбросано по компоненту: экран, который сам решает,
 * что показать, из четырёх условий подряд, однажды покажет «ошибку ссылки» тому, кто просто
 * пришёл раньше времени.
 */
export type ArrivalState =
  | 'waiting' // до начала: расписание и проверка камеры
  | 'live' // «занятие идёт — заходите»
  | 'host_offline' // 🔴 главный экран листа
  | 'finished' // «занятие закончилось»
  | 'link_replaced' // «эта ссылка больше не работает»
  | 'not_in_group' // посторонний со ссылкой
  | 'knock'; // режим «с вашим подтверждением на входе»

type View = NonNullable<MeetingPointQuery['meetingPoint']>;

/**
 * Порядок проверок — это и есть решение, и он не произволен.
 *
 * 1. **Мёртвая ссылка** сначала: человеку с заменённой ссылкой нельзя сперва сказать «идёт
 *    занятие», а потом отобрать — и «не найдено» отправило бы его искать опечатку, которой он
 *    не делал.
 * 2. **Право войти** раньше состояния комнаты: постороннему не показывают, что происходит
 *    внутри, даже одним словом.
 * 3. **Хост** раньше расписания: пока машина выключена, живой комнаты нет, чем бы ни было
 *    заполнено расписание. Это честнее, чем обратный порядок, при котором ученик жмёт «войти»
 *    и упирается в тишину.
 *
 * Часов здесь нет намеренно: «идёт ли занятие» решает сервер (`isLive`), а не арифметика по
 * местному времени браузера — иначе ребёнок с убежавшими часами получит своё состояние урока.
 */
export function arrivalState(view: View): ArrivalState {
  const decision: JoinDecision = view.decision;
  if (decision === 'LINK_REPLACED') return 'link_replaced';
  if (decision === 'NOT_IN_GROUP') return 'not_in_group';
  if (decision === 'KNOCK_REQUIRED') return 'knock';

  if (!view.hostOnline) return 'host_offline';

  const next = view.nextLesson;
  if (next?.isLive) return 'live';
  if (next) return 'waiting';

  // Хост в сети, а ближайшего занятия нет: последнее уже прошло.
  return 'finished';
}

/** Сколько минут до начала. Отрицательное — уже началось бы, да преподаватель не открыл. */
export function minutesUntil(startAt: string, now: Date = new Date()): number {
  return Math.round((new Date(startAt).getTime() - now.getTime()) / 60_000);
}

/**
 * Что работает прямо сейчас — прямо из ответа сервера, без второго мнения.
 *
 * 🔴 Экран, который сам решает, что доступно, однажды разойдётся с тем, что действительно
 * отвечает, и соврёт ребёнку про то, зря ли он сидит перед страницей. Поэтому список —
 * `capabilities` как есть (`meetingpoint/capabilities.py`, один источник).
 */
export function availableWithoutHost(view: View): string[] {
  const caps = view.capabilities;
  const rows: string[] = [];
  if (caps.schedule) rows.push('schedule');
  if (caps.myWork) rows.push('myWork');
  if (caps.myGrades) rows.push('myGrades');
  if (caps.myDiary) rows.push('myDiary');
  if (caps.mySummaries) rows.push('mySummaries');
  if (caps.myBoards) rows.push('myBoards');
  if (caps.myMaterials) rows.push('myMaterials');
  if (caps.homework) rows.push('homework');
  if (caps.chat) rows.push('chat');
  return rows;
}
