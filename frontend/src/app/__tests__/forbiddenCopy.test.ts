import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * 🔴 «ЧТО-ТО ПОШЛО НЕ ТАК» ЗАПРЕЩЕНО (ПРАВИЛА 6.4).
 *
 * «Не отвечает сервер» лечится одним действием, «нет права» — другим, а общая фраза не
 * лечится ничем: человек читает её и не знает даже, потерял он свою работу или нет.
 *
 * Нашлось чтением словарей при сборке экрана создания курса — в трёх местах сразу, включая
 * мастер первого запуска. Ни один прибор геометрии такое не видит: надпись правильной длины
 * и правильного цвета.
 */
const LOCALES = resolve(__dirname, '..', '..', 'i18n', 'locales', 'ru');

const FORBIDDEN = [
  { what: 'Что-то пошло не так', why: 'ПРАВИЛА 6.4 — отказ обязан назвать причину' },
  { what: 'Ошибка сервера', why: 'то же самое другими словами' },
  { what: 'Неизвестная ошибка', why: 'то же самое третьими словами' },
];

function strings(node: unknown, path: string, out: [string, string][]): void {
  if (typeof node === 'string') out.push([path, node]);
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) strings(v, path ? `${path}.${k}` : k, out);
  }
}

describe('запретные формулировки', () => {
  const files = readdirSync(LOCALES).filter((f) => f.endsWith('.json'));

  it('прибор читает все словари, а не пустой список', () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it('ни в одном словаре нет отказа без причины', () => {
    const found: string[] = [];
    for (const file of files) {
      const out: [string, string][] = [];
      strings(JSON.parse(readFileSync(join(LOCALES, file), 'utf8')), '', out);
      for (const [path, value] of out) {
        for (const rule of FORBIDDEN) {
          if (value.includes(rule.what)) found.push(`${file}:${path} — «${rule.what}» (${rule.why})`);
        }
      }
    }
    expect(found, `отказ без причины:\n${found.join('\n')}`).toEqual([]);
  });
});
