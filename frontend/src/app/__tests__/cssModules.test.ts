import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * 🔴 КЛАСС, КОТОРОГО НЕТ В МОДУЛЕ, ПРИХОДИТ В РАЗМЕТКУ КАК `undefined` — МОЛЧА.
 *
 * Ни ошибки сборки, ни красного теста: элемент просто теряет все стили и складывается. При
 * сносе старого слоя оформления (наряд 42) это ГЛАВНАЯ опасность — стили экрана переписаны,
 * а разметка ещё зовёт прежние имена.
 *
 * Поймано вживую: после пересборки кабинета прибор дизайнера нашёл три наложения текста в
 * «Моих курсах» — карточка звала пять классов, которых в новом файле не было, и три подписи
 * легли друг на друга. Тесты поведения при этом были зелёные: поведение не пострадало.
 *
 * Проверка сравнивает `styles.имя` в компоненте с объявленными классами его модуля.
 */
const SRC = resolve(__dirname, '..', '..');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return name === 'node_modules' ? [] : walk(full);
    return full.endsWith('.tsx') && !full.includes('.test.') ? [full] : [];
  });
}

/** Какой модуль стилей импортирует файл под именем `styles`. */
function styleImport(text: string): string | null {
  return /import\s+styles\s+from\s+'([^']+\.module\.css)'/.exec(text)?.[1] ?? null;
}

describe('модули стилей — имя класса существует', () => {
  const files = walk(SRC);

  it('прибор смотрит на весь src, а не на пустой список', () => {
    // Молчание прибора ≠ отсутствие дефекта: без этой строки проверка прошла бы на нуле файлов.
    expect(files.length).toBeGreaterThan(100);
    expect(files.filter((f) => styleImport(readFileSync(f, 'utf8'))).length).toBeGreaterThan(30);
  });

  it('ни один компонент не зовёт класс, которого в его модуле нет', () => {
    const broken: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      const rel = styleImport(text);
      if (!rel) continue;
      const cssPath = rel.startsWith('.')
        ? resolve(file, '..', rel)
        : resolve(SRC, rel.replace(/^@\//, ''));
      let css: string;
      try {
        css = readFileSync(cssPath, 'utf8');
      } catch {
        broken.push(`${file}: модуль ${rel} не найден`);
        continue;
      }
      const have = new Set([...css.matchAll(/\.([A-Za-z][\w-]*)/g)].map((m) => m[1]));
      const used = new Set([...text.matchAll(/styles\.([A-Za-z]\w*)/g)].map((m) => m[1]));
      const missing = [...used].filter((name) => !have.has(name));
      if (missing.length) broken.push(`${file.slice(SRC.length + 1)}: ${missing.join(', ')}`);
    }
    expect(broken, `классы без стилей:\n${broken.join('\n')}`).toEqual([]);
  });
});
