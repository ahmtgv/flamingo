/**
 * Ключ машины — только связка ключей ОС (PROMPT_14 §2.2.2, OWNER_SCOPE §19.4).
 *
 * 🔒 The one hard rule, and the reason this is a module rather than two lines inside the
 * pairing screen: **the key never touches a config file and never touches localStorage.** A
 * key in web storage is a key that any script on the page can read and that survives in a
 * browser profile backup; a key in a config file is a key that ends up in a support archive.
 * The OS keychain is the one store that is encrypted at rest and scoped to the account.
 *
 * There is deliberately no `readMachineKey()` here. Nothing in the React app needs to *see*
 * the key — the shell attaches it to outgoing requests. A getter would exist only to be
 * logged by accident.
 */

type Invoke = (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;

function invoke(): Invoke | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { __TAURI_INTERNALS__?: { invoke?: Invoke } }).__TAURI_INTERNALS__
    ?.invoke;
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
