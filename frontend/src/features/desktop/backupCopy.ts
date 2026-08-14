/**
 * Копия обязана покинуть машину (Р5.5-Б).
 *
 * 🔴 Копия на том же диске — не копия. Sidecar кладёт файл в папку кабинета; тот же пролитый
 * кофе уносит и оригинал, и её. На первом запуске мы обещаем «на внешний диск или в вашу
 * папку облака» (§19.1), и это модуль, который обещание выполняет.
 *
 * 🔒 Адрес живёт в оболочке и через GraphQL не ходит — то же правило, по которому там нет пути
 * к папке кабинета (`cabinetFolder.ts`). Sidecar возвращает **имя** файла; где искать папку
 * `backups`, оболочка знает сама, потому что сама её и назначила при запуске sidecar.
 */

type Invoke = (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;

function invoke(): Invoke | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { __TAURI_INTERNALS__?: { invoke?: Invoke } }).__TAURI_INTERNALS__
    ?.invoke;
}

/**
 * Почему копия не уехала — причина, а не текст.
 *
 * Слова подбирает экран через i18n: `unavailable` — мы в браузере, `no-destination` — место
 * ещё не выбирали, `destination-missing` — **диск отключён**. Последнее и есть то, ради чего
 * тут вообще есть тип ошибки: молча записать в старую папку значит сделать вид, что копия
 * есть, ровно в тот момент, когда её нет.
 */
export type CopyOutFailure = 'unavailable' | 'no-destination' | 'destination-missing' | 'failed';

export type CopyOutResult = { ok: true; at: string } | { ok: false; reason: CopyOutFailure };

/** Куда договорились возить копии. Пусто — ещё не спрашивали. */
export async function backupDestination(): Promise<string> {
  const call = invoke();
  if (!call) return '';
  try {
    const value = await call('backup_destination');
    return typeof value === 'string' ? value : '';
  } catch {
    return '';
  }
}

/**
 * Спросить место — **один раз**, дальше копии уезжают туда сами (лист D2, §19.1).
 *
 * Путь приходит из системного выбора папки в оболочке; здесь он только передаётся дальше и
 * никуда больше не попадает.
 */
export async function chooseBackupDestination(path: string): Promise<string> {
  const call = invoke();
  if (!call) return '';
  try {
    const value = await call('choose_backup_destination', { path });
    return typeof value === 'string' ? value : '';
  } catch {
    return '';
  }
}

/** Перенести только что снятую копию наружу. Принимает ИМЯ файла, не путь. */
export async function copyBackupOut(fileName: string): Promise<CopyOutResult> {
  const call = invoke();
  if (!call) return { ok: false, reason: 'unavailable' };
  try {
    const at = await call('move_backup_out', { fileName });
    return { ok: true, at: typeof at === 'string' ? at : '' };
  } catch (error) {
    const message = String((error as { message?: string })?.message ?? error);
    if (message.includes('no-destination')) return { ok: false, reason: 'no-destination' };
    if (message.includes('destination-missing')) return { ok: false, reason: 'destination-missing' };
    return { ok: false, reason: 'failed' };
  }
}

/**
 * Что показывать в настройках: дата и место **удавшейся** копии.
 *
 * Удавшейся — потому что копия, которая снялась, но никуда не уехала, это не копия, и
 * показывать её датой как «последняя копия» было бы неправдой в единственном месте, где
 * преподаватель эту правду проверяет.
 */
const LAST_KEY = 'flamingo.backup.lastOut';

export interface LastCopyOut {
  at: string;
  where: string;
}

export function rememberCopyOut(where: string): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(LAST_KEY, JSON.stringify({ at: new Date().toISOString(), where }));
}

export function lastCopyOut(): LastCopyOut | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(LAST_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as LastCopyOut;
    return parsed?.at ? parsed : null;
  } catch {
    return null;
  }
}
