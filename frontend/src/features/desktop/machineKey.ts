/**
 * Ключ машины — только связка ключей ОС (PROMPT_14 §2.2.2, OWNER_SCOPE §19.4).
 *
 * 🔒 The one hard rule, and the reason this is a module rather than two lines inside the
 * pairing screen: **the key never touches a config file and never touches localStorage.** A
 * key in web storage is a key that any script on the page can read and that survives in a
 * browser profile backup; a key in a config file is a key that ends up in a support archive.
 * The OS keychain is the one store that is encrypted at rest and scoped to the account.
 *
 * 🔴 Правка 15.08. Здесь стояло «геттера нет и не будет: ничего в React не нуждается видеть
 * ключ — оболочка сама приложит его к запросам». Оболочка этого не делала и не могла: запросы
 * уходят из webview, а не из Rust. Ценой ошибки стал весь мастер — шаги 2–5 ходят на мутации,
 * требующие `Authorization: Device <ключ>`, и предъявить его было нечем: кнопки молча ничего
 * не делали.
 *
 * 🔒 Что от той осторожности осталось правилом: ключ живёт **в памяти вкладки** и нигде больше.
 * Его читают один раз при старте, держат в переменной модуля и отдают ТОЛЬКО сетевому слою.
 * Ни `localStorage`, ни конфиг, ни лог — и функции, которая печатала бы его, здесь нет.
 */

type Invoke = (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;

function invoke(): Invoke | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { __TAURI_INTERNALS__?: { invoke?: Invoke } }).__TAURI_INTERNALS__
    ?.invoke;
}

// --- ключ в памяти -----------------------------------------------------------------------
//
// Переменная модуля, а не хранилище: она умирает вместе с процессом, и это ровно то время
// жизни, которое ключу положено. Читается один раз при старте (`primeMachineKey`) и после
// связывания — тогда мастер идёт дальше без перезапуска.
let inMemoryKey: string | null = null;

/**
 * Прочитать ключ из связки в память. Возвращает, есть ли он.
 *
 * Вызывается один раз при запуске приложения. В браузере — no-op: там нет ни связки ключей,
 * ни машины, которую бы этот ключ представлял.
 */
export async function primeMachineKey(): Promise<boolean> {
  const call = invoke();
  if (!call) return false;
  try {
    const key = await call('read_machine_key');
    inMemoryKey = typeof key === 'string' && key.length > 0 ? key : null;
    return inMemoryKey !== null;
  } catch {
    inMemoryKey = null;
    return false;
  }
}

/**
 * Ключ для сетевого слоя. Синхронный: заголовок собирается на каждом запросе, и ждать там
 * нечего — ключ уже в памяти.
 */
export function machineKeyInMemory(): string | null {
  return inMemoryKey;
}

function setInMemoryKey(key: string | null): void {
  inMemoryKey = key;
}

/**
 * Hand the key to the OS keychain. Returns false in a browser tab, where there is no keychain
 * and therefore no safe place — and where, correspondingly, no pairing should be completing.
 *
 * ⚠️ It never falls back to storing the key somewhere else. A fallback is how «never in
 * localStorage» becomes «usually not in localStorage».
 */
export async function rememberMachineKey(token: string): Promise<boolean> {
  const call = invoke();
  if (!call) return false;
  try {
    await call('store_machine_key', { token });
    // И в память — сразу: следующий же шаг мастера пойдёт с этим ключом, без перезапуска.
    setInMemoryKey(token);
    return true;
  } catch {
    return false;
  }
}

/** Отзыв на этой машине: ключ уходит из связки. Серверный отзыв — отдельная мутация. */
export async function forgetMachineKey(): Promise<boolean> {
  const call = invoke();
  if (!call) return false;
  try {
    await call('forget_machine_key');
    // Отозвали — значит и представляться больше нечем. Иначе вкладка продолжила бы ходить
    // с ключом, которого в связке уже нет.
    setInMemoryKey(null);
    return true;
  } catch {
    return false;
  }
}

/** Есть ли у этой машины ключ — без выдачи самого ключа. */
export async function hasMachineKey(): Promise<boolean> {
  const call = invoke();
  if (!call) return false;
  try {
    return (await call('has_machine_key')) === true;
  } catch {
    return false;
  }
}
