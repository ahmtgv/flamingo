/**
 * The thin line between the React app and the Tauri shell (atlas sheet D1).
 *
 * The same bundle is served to browsers, so this file must cost a browser nothing and must
 * never assume it is inside the app. Every function degrades to a no-op that reports failure
 * honestly instead of throwing: a teacher in Chrome pressing a button that only means
 * something in the app should get nothing, not a broken screen.
 *
 * Written against the shell's raw invoke bridge rather than `@tauri-apps/api` for exactly that
 * reason — a dependency whose whole purpose is unreachable in the browser build would ship to
 * every pupil to be tree-shaken and hoped about.
 */

type Invoke = (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;

interface TauriInternals {
  invoke?: Invoke;
}

function internals(): TauriInternals | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { __TAURI_INTERNALS__?: TauriInternals }).__TAURI_INTERNALS__;
}

/** Are we inside the teacher's app, or in a browser tab? */
export function isDesktop(): boolean {
  return typeof internals()?.invoke === 'function';
}

async function call(cmd: string, args?: Record<string, unknown>): Promise<boolean> {
  const invoke = internals()?.invoke;
  if (!invoke) return false;
  try {
    await invoke(cmd, args);
    return true;
  } catch {
    // A shell that cannot hide its own window is not a reason to take the lesson down with it.
    return false;
  }
}

/**
 * Свернуть — **and leave the lesson running**.
 *
 * 🔴 This is the whole point of the button and of sheet D1's tray section: «Свёрнутое окно не
 * заканчивает урок». It does not touch the session, the sidecar or the room. Ending a lesson
 * has its own button in the strip, and it says «Завершить», because the teacher frequently
 * minimises and forgets the room is open.
 *
 * ⚠️ Находка владельца 15.08 №3: «нажатие — и всё замирает». Кнопка ПРЯТАЛА окно
 * (`window.hide()`), и вернуть его можно было только через значок в трее. Для человека,
 * который не знал про трей, приложение просто исчезало — и это неотличимо от зависания.
 * Теперь окно сворачивается в Dock/панель задач, как сворачивается всё остальное на машине:
 * возврат — привычным движением, а не знанием про нашу реализацию.
 */
export function minimiseWindow(): Promise<boolean> {
  return call('minimise_window');
}

/**
 * Положить строку в буфер обмена — через оболочку.
 *
 * 🔴 Владелец 16.08 (§6.1): шесть знаков кода переписывают руками в браузер на ТОМ ЖЕ
 * компьютере. `navigator.clipboard` внутри webview упирается в разрешения и молча ничего не
 * делает; молчащих кнопок здесь уже хватило. Возвращает `false`, если не вышло, — и экран
 * обязан это сказать, а не сделать вид.
 */
export function copyText(text: string): Promise<boolean> {
  return call('copy_text', { text });
}

/**
 * Открыть адрес во ВНЕШНЕМ браузере.
 *
 * 🔴 Находка владельца 15.08 №2: «"Открыть страницу в браузере" не открывает». Внутри Tauri
 * обычная ссылка `target="_blank"` не открывает ничего: webview не умеет заводить новые окна,
 * и нажатие проваливалось молча.
 *
 * Открывать надо именно СНАРУЖИ и по существу дела, а не для удобства: человек входит в свою
 * учётную запись, и делать это он должен там, где видны адресная строка и замок (§19.4).
 */
export function openExternal(url: string): Promise<boolean> {
  return call('open_external', { url });
}

/**
 * What the tray icon says while the window is away.
 *
 * The sheet asks for the title, repeated: «в трее то же, что в заголовке — идёт занятие,
 * сколько времени, сколько человек». One string, composed by the caller in Russian through
 * i18n like every other piece of product text.
 */
export function setTrayLabel(label: string): Promise<boolean> {
  return call('set_tray_label', { label });
}

/**
 * Renames the tray menu from `ru.json`.
 *
 * The tray exists before the webview finishes loading, so the shell gives its two items Russian
 * defaults and this replaces them from the locale file. Without it the tray would hold the only
 * two strings in the product that no locale file knows about (CLAUDE.md §2.4).
 */
export function setTrayMenu(show: string, quit: string): Promise<boolean> {
  return call('set_tray_menu', { show, quit });
}

/** The build's version, for the title bar. Falls back to the web bundle's own version. */
export const APP_VERSION: string = import.meta.env.VITE_APP_VERSION ?? '0.1.0';
