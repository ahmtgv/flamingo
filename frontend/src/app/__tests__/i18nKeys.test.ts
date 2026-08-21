import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * 🔴 КНОПКА ПОКАЗЫВАЛА КЛЮЧ ВМЕСТО СЛОВА — «actions.signIn» на каталоге гостю.
 *
 * Ключа в наборе не было: я взял имя по аналогии с соседним экраном и не проверил. Приборы
 * геометрии такое не видят вовсе — надпись правильной длины и правильного цвета, — а тесты
 * поведения ищут кнопку по РУССКОМУ имени и на чужом экране её просто не спрашивают.
 *
 * Нашлось проходом пути (§48 п.2). Чтобы больше не находилось так, проверка разбирает
 * исходники: каждый `t('ns:path.to.key')` обязан существовать в словаре.
 */
const SRC = resolve(__dirname, '..', '..');
const LOCALES = resolve(SRC, 'i18n', 'locales', 'ru');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return name === 'node_modules' ? [] : walk(full);
    return /\.tsx?$/.test(full) && !full.includes('.test.') ? [full] : [];
  });
}

function dictionary(ns: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(join(LOCALES, `${ns}.json`), 'utf8'));
  } catch {
    return null;
  }
}

/** Формы множественного числа: i18next разрешает `count` в `count_one` и его братьев. */
const PLURALS = ['_one', '_few', '_many', '_other', '_zero'];

function has(dict: Record<string, unknown>, path: string): boolean {
  const parts = path.split('.');
  const last = parts.pop() as string;
  let node: unknown = dict;
  for (const part of parts) {
    if (typeof node !== 'object' || node === null) return false;
    node = (node as Record<string, unknown>)[part];
  }
  if (typeof node !== 'object' || node === null) return false;
  const table = node as Record<string, unknown>;
  // ⚠️ Ключ склонения существует только в формах: искать голый `count` бессмысленно, и
  // первая версия проверки на этом соврала — назвала четыре живых ключа пропавшими.
  return table[last] !== undefined || PLURALS.some((suffix) => table[last + suffix] !== undefined);
}

describe('строки интерфейса', () => {
  const files = walk(SRC);

  it('прибор смотрит на весь src и на все словари', () => {
    expect(files.length).toBeGreaterThan(100);
    expect(readdirSync(LOCALES).filter((f) => f.endsWith('.json')).length).toBeGreaterThan(5);
  });

  it('🔴 ни один экран не показывает ключ вместо слова', () => {
    const missing: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      // Только явные ключи с пространством имён: `t(`ns:a.b`)`. Собранные из переменных
      // (`t(`windows.${id}`)`) проверить статически нельзя, и врать об этом не будем.
      for (const m of text.matchAll(/\bt\(\s*'([a-z]+):([A-Za-z][\w.]*)'/g)) {
        const dict = dictionary(m[1]);
        if (!dict) {
          missing.push(`${file.slice(SRC.length + 1)}: нет словаря ${m[1]}`);
          continue;
        }
        if (!has(dict, m[2])) missing.push(`${file.slice(SRC.length + 1)}: ${m[1]}:${m[2]}`);
      }
    }
    expect(missing, `ключи без строк:\n${missing.join('\n')}`).toEqual([]);
  });
});
