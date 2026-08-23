import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * 🔴 ПОТОЛОК ШИРИНЫ БЕЗ ЦЕНТРИРОВАНИЯ — ДЕФЕКТ, А НЕ СТИЛЬ (наряд 49 §4).
 *
 * Владелец прислал снимок: содержимое в левом углу, справа пустует треть окна. Причина —
 * `max-width: 860px` без `margin: auto` на «Настройках»; то же было на конспекте.
 *
 * И второе: десять потолков были написаны литералами в четырёх единицах (1120px, 80rem,
 * 68rem, 46rem, 74ch…), при том что три токена существуют и в комментарии к ним прямо
 * написано, зачем они заведены.
 */
const ROOT = resolve(__dirname, '../..');

function cssFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...cssFiles(full));
    else if (full.endsWith('.module.css')) out.push(full);
  }
  return out;
}

/** Правила целиком — чтобы спрашивать не про строку, а про соседей в том же блоке. */
function rules(css: string): string[] {
  return css.match(/\{[^{}]*\}/g) ?? [];
}

describe('ширина кадра', () => {
  it('каждый потолок из токена центрирован', () => {
    const guilty: string[] = [];
    for (const file of cssFiles(ROOT)) {
      const css = readFileSync(file, 'utf8');
      for (const rule of rules(css)) {
        if (!/max-(?:width|inline-size): var\(--content-max-/.test(rule)) continue;
        // `place-items: center` у родителя центрирует и без margin — но тогда это видно
        // в самом правиле: либо margin, либо оно само центрирующее.
        if (/margin/.test(rule)) continue;
        guilty.push(`${file.replace(ROOT, '')}: ${rule.replace(/\s+/g, ' ').slice(0, 80)}`);
      }
    }
    // Единственное исключение — карточка «нет сети»: её центрирует родитель `place-items`.
    expect(guilty.filter((g) => !g.includes('desktop.module.css'))).toEqual([]);
  });

  it('порогов перелома ровно три', () => {
    const found = new Set<string>();
    for (const file of cssFiles(ROOT)) {
      for (const m of readFileSync(file, 'utf8').matchAll(/@media \(max-width: (\d+px)\)/g)) {
        found.add(m[1]);
      }
    }
    // Восемь порогов на двадцать экранов — это не адаптивность, а отсутствие решения.
    expect([...found].sort()).toEqual(['1100px', '700px', '900px']);
  });
});
