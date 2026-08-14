/**
 * Домашняя работа пишется при выключенном хосте и уходит сама (лист D3, Р5.6).
 *
 * 🔴 Почему это вообще нужно. Домашняя работа живёт на машине преподавателя (правило «двух
 * адресов»), а машина выключена — обычное дело, а не поломка. Ребёнок, севший делать домашку
 * в девять вечера, не должен упереться в «преподаватель не в сети»: лист обещает «можно писать
 * сейчас — ответ уйдёт сам, когда преподаватель появится в сети», и вот исполнение обещания.
 *
 * ⚠️ Черновик лежит **у ученика в браузере**, а не на сервере. Точка встречи не принимает
 * работы: работы — это данные преподавательской стороны, и заводить им второй приёмник значило
 * бы завести вторую правду о том, что сдано. Как только хост появился, очередь уходит по
 * обычному пути, и запись о сдаче ровно одна. Решение владельца, подтверждено.
 *
 * 🔴 Из этого следует обязанность, а не оговорка: **экран говорит, где лежит черновик**
 * (`available.homeworkDraft`). Иначе ребёнок узнает это сам — открыв ноутбук родителей и не
 * найдя написанного вчера, то есть в худший возможный момент.
 */

const KEY = 'flamingo.homework.outbox';

export interface PendingSubmission {
  homeworkId: string;
  text: string;
  /** Когда ребёнок это написал. Именно это время интересно, а не когда доехало. */
  writtenAt: string;
}

function read(): PendingSubmission[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(parsed) ? (parsed as PendingSubmission[]) : [];
  } catch {
    return [];
  }
}

function write(rows: PendingSubmission[]): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(rows));
}

/** Отложить работу до появления хоста. Одна работа — одна запись: повтор заменяет черновик. */
export function queueSubmission(homeworkId: string, text: string): PendingSubmission[] {
  const rows = read().filter((r) => r.homeworkId !== homeworkId);
  rows.push({ homeworkId, text, writtenAt: new Date().toISOString() });
  write(rows);
  return rows;
}

export function pending(): PendingSubmission[] {
  return read();
}

export function pendingFor(homeworkId: string): PendingSubmission | null {
  return read().find((r) => r.homeworkId === homeworkId) ?? null;
}

/**
 * Отправить всё, что ждало. Возвращает то, что уехало.
 *
 * ⚠️ Из очереди удаляется **только то, что сервер принял**. Ошибка оставляет запись на месте:
 * сочинение, которое ребёнок написал вечером, не должно исчезнуть потому, что сеть моргнула
 * на середине списка — это ровно та потеря, ради предотвращения которой очередь и существует.
 */
export async function flush(
  send: (row: PendingSubmission) => Promise<boolean>,
): Promise<PendingSubmission[]> {
  const rows = read();
  if (rows.length === 0) return [];

  const sent: PendingSubmission[] = [];
  const kept: PendingSubmission[] = [];
  for (const row of rows) {
    let ok = false;
    try {
      ok = await send(row);
    } catch {
      ok = false;
    }
    (ok ? sent : kept).push(row);
  }
  write(kept);
  return sent;
}
