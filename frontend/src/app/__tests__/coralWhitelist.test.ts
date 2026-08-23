import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * 🔴 КОРАЛЛОВЫЙ — ТОЛЬКО В ЧЕТЫРЁХ МЕСТАХ (наряд 50 §3.2, решение владельца §61.3).
 *
 * Владелец дословно: «чтобы я не видел кораллового нигде больше, кроме как в логотипе,
 * в алармах и кнопках „конец урока" и „отмена". Всё!»
 *
 * Правило вводится ТРЕТИЙ раз (§42, §57, §61.3), и оба предыдущих раза откатились сами —
 * потому что коралл был УМОЛЧАНИЕМ (`Button.module.css: .primary`), а зелёный исключением.
 * Исключение всегда проигрывает умолчанию. Теперь наоборот, и вот сторож, которого не было.
 *
 * ⚠️ Список — файлами и селекторами, не «на глаз». Растёт он только вместе с решением
 * владельца: каждая новая строка здесь означает пятое место для коралла.
 */
const SRC = resolve(__dirname, '../..');

/** Четыре места, где коралл законен. */
const ALLOWED = [
  // 1. Знак бренда.
  'shared/ui/Logo/',
  'shared/ui/BrandMark/',
  // 2. Тревога: отказы, «нет связи», ошибки, состояние error.
  'shared/ui/ErrorState/',
  'shared/ui/StateCard/',
  'shared/ui/Badge/', // «горит» — счётчик, требующий внимания
  'features/chat/ui/chat.module.css', // непрочитанное — то же «горит»
  'shared/ui/ConnectionLine/', // «нет связи» — тревога, и самая частая
  'shared/ui/ErrorBoundary/', // экран упал — тревога по определению
  'seedum/', // внимание ушло — то, ради чего показатель и рисуется
  // 3. «Завершить урок» / «Завершить» и 4. «Отмена»/уход: `.danger` + пульт комнаты.
  'shared/ui/Button/Button.module.css',
  'features/lesson/ui/roomframe.module.css',
  'features/lesson/ui/classpane.module.css', // поднятая рука — тревога на плитке
  'features/lesson/ui/videoroom.module.css', // и она же в полосе лиц
  // Сами определения токенов и общие стили состояний.
  'shared/styles/tokens.css',
];

/** Коралловая заливка/краска. Обводка и подложка состояний — тоже коралл. */
const CORAL = /--color-accent(-solid|-text|-subtle|-hover|-line)?\b|--color-link\b/;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return name === 'node_modules' ? [] : files(full);
    return /\.(module\.css|tsx|ts)$/.test(full) && !/\.test\.tsx?$/.test(full) ? [full] : [];
  });
}

describe('коралловый', () => {
  const all = files(SRC);

  it('прибор смотрит на весь продукт, а не на пустой список', () => {
    expect(all.length).toBeGreaterThan(200);
  });

  it('🔴 не встречается вне четырёх разрешённых мест', () => {
    const guilty: string[] = [];
    for (const file of all) {
      const rel = file.slice(SRC.length + 1);
      if (ALLOWED.some((ok) => rel.startsWith(ok) || rel.includes(ok))) continue;
      const text = readFileSync(file, 'utf8');
      text.split('\n').forEach((line, i) => {
        if (line.trim().startsWith('*') || line.trim().startsWith('//')) return; // комментарии
        if (CORAL.test(line)) guilty.push(`${rel}:${i + 1}  ${line.trim().slice(0, 70)}`);
      });
    }
    expect(
      guilty,
      `коралл вне белого списка (можно: знак бренда · тревога · «Завершить» · «Отмена»):\n${guilty.join('\n')}`,
    ).toEqual([]);
  });

  it('🔴 главное действие зелёное по умолчанию', () => {
    // Ровно та строка, из-за которой правило откатывалось дважды.
    const button = readFileSync(join(SRC, 'shared/ui/Button/Button.module.css'), 'utf8');
    const primary = /\.primary \{[^}]*\}/.exec(button)?.[0] ?? '';
    expect(primary).toContain('--color-go-solid');
    expect(primary).not.toContain('--color-accent');
  });
});
