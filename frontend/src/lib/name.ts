/** Имя, которым человек назвался. Держим между заходами, чтобы не спрашивать дважды. */
const KEY = 'flamingo.name'

export function rememberedName(): string {
  try {
    return localStorage.getItem(KEY) ?? ''
  } catch {
    return ''
  }
}

export function rememberName(name: string): void {
  try {
    localStorage.setItem(KEY, name)
  } catch {
    /* приватное окно — имя просто не запомнится, и это не отказ */
  }
}
