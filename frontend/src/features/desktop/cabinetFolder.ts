/**
 * Папка кабинета — местная и только местная (atlas D2 шаг 2, OWNER_SCOPE §19.1).
 *
 * 🔒 The path lives on the machine that owns it and is never sent anywhere. §19.1 makes the
 * copy mandatory, which makes *whether* one is configured a fact the product is entitled to
 * keep — that goes to the server as `BackupKind`. **Where** it sits carries the teacher's OS
 * account name and buys us nothing, so it stays here, in the app's own local store.
 *
 * `test_first_run.py` holds the other end: the `Device` model has no path-shaped column, so a
 * future field cannot quietly acquire one.
 */

const STORAGE_KEY = 'flamingo.cabinet.folder';

/** Показывается на экране, пока преподаватель не выбрал своё. */
const DEFAULT_FOLDER = '~/Flamingo/Кабинет';

type Invoke = (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;

function invoke(): Invoke | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { __TAURI_INTERNALS__?: { invoke?: Invoke } }).__TAURI_INTERNALS__
    ?.invoke;
}

/**
 * Где кабинет сейчас.
 *
 * localStorage is the right store for this and the wrong one for the machine key — the
 * difference is that a folder path is not a credential. Anything that authenticates goes to
 * the OS keychain and only there (`machineKey.ts`).
 */
export function cabinetFolder(): string {
  if (typeof localStorage === 'undefined') return DEFAULT_FOLDER;
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_FOLDER;
}

/** Системный выбор папки. В браузере возвращает null — выбирать нечего. */
export async function chooseCabinetFolder(): Promise<string | null> {
  const call = invoke();
  if (!call) return null;
  try {
    const chosen = await call('choose_cabinet_folder');
    if (typeof chosen !== 'string' || !chosen) return null;
    localStorage.setItem(STORAGE_KEY, chosen);
    return chosen;
  } catch {
    return null;
  }
}

/** «Показать в Finder» с экрана настроек. */
export async function revealCabinetFolder(): Promise<boolean> {
  const call = invoke();
  if (!call) return false;
  try {
    await call('reveal_cabinet_folder', { path: cabinetFolder() });
    return true;
  } catch {
    return false;
  }
}
