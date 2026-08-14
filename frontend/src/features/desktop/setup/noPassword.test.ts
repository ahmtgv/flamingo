import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const desktop = resolve(here, '..');

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? filesUnder(full) : [full];
  });
}

const sources = filesUnder(desktop).filter(
  (f) => /\.(ts|tsx|graphql)$/.test(f) && !f.endsWith('.test.ts') && !f.endsWith('.test.tsx'),
);

/**
 * The file with its comments removed.
 *
 * These assertions are about what the code *does*, and the modules here explain at length why
 * they do not touch localStorage — prose that a naive grep reads as the very thing it forbids.
 * Stripping comments is what lets a rule be documented and enforced in the same file.
 */
function codeOf(file: string): string {
  return readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
    .replace(/^#.*$/gm, ' '); // .graphql comments
}

/**
 * 🔒 «Пароль в приложении не спрашивается» — OWNER_SCOPE §19.4, PROMPT_14 §2.2.1.
 *
 * The decision is not «we currently have no password field», it is «there is no path by which
 * a password crosses this app's boundary». A rule like that survives exactly as long as
 * something checks it, so this file greps the whole desktop feature rather than trusting a
 * reviewer to notice a `<input type="password">` in a diff six phases from now.
 *
 * The fallback «войти по почте и паролю» is a LINK to the web login — which is why a link is
 * allowed here and a field is not.
 */
describe('🔒 приложение не принимает пароль (§19.4)', () => {
  it('во всей фиче нет ни одного поля пароля', () => {
    for (const file of sources) {
      const text = codeOf(file);
      expect(text, `${file}: поле пароля в приложении`).not.toMatch(/type=["']password["']/);
      expect(text, `${file}: автозаполнение пароля`).not.toMatch(/autoComplete=["'][^"']*password/);
    }
  });

  it('ни одна операция не несёт пароль', () => {
    for (const file of sources.filter((f) => f.endsWith('.graphql'))) {
      const text = codeOf(file).toLowerCase();
      expect(text, `${file}: пароль в GraphQL-операции`).not.toMatch(/\$password|password:/);
    }
  });

  it('ключ машины не кладётся в localStorage и не в файл конфигурации', () => {
    // PROMPT_14 §2.2.2. Ключ живёт в связке ключей ОС, и «machineKey.ts» — единственный, кто
    // его вообще касается; там localStorage не упоминается ни разу.
    const machineKey = codeOf(join(desktop, 'machineKey.ts'));
    expect(machineKey).not.toMatch(/localStorage|sessionStorage|writeTextFile|\.env/);
    expect(machineKey).toMatch(/store_machine_key/);

    // И ни один другой файл фичи не пытается сохранить учётные данные сам.
    //
    // Ищем именно credentials, а не слово «key»: `STORAGE_KEY` — имя ключа хранилища, и папка
    // кабинета лежит в localStorage совершенно законно (это путь, а не пропуск). Запрещено
    // класть туда то, чем машина аутентифицируется.
    for (const file of sources) {
      const text = codeOf(file);
      expect(text, `${file}: учётные данные рядом с localStorage`).not.toMatch(
        /localStorage\.setItem\([\s\S]{0,80}(token|secret|password|machineKey)/i,
      );
    }
  });

  it('🔒 путь к папке кабинета не уходит ни в одну операцию', () => {
    // §19.1 даёт нам право знать, что копия настроена. Где она лежит — диск преподавателя и
    // имя его учётной записи в системе; это остаётся на машине (cabinetFolder.ts).
    for (const file of sources.filter((f) => f.endsWith('.graphql'))) {
      const text = codeOf(file).toLowerCase();
      expect(text, `${file}: путь к кабинету в операции`).not.toMatch(
        /\$?(cabinet)?path|folder:|directory/,
      );
    }
  });
});
