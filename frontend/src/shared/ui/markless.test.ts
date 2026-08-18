import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * 🔴 ЗНАЧКИ ВМЕСТО ОТМЕТОК ЗАПРЕЩЕНЫ ТОЖЕ (наряд §34.4).
 *
 * Требование внешнее: ФГОС начального общего образования (приказ Минобрнауки РФ № 373 от
 * 06.10.2009, ред. приказа Минпросвещения № 286 от 31.05.2021) плюс ФЗ-273 — дошкольники и
 * первый класс учатся БЕЗ ОТМЕТОК. Легко потерять вторую половину требования: **звёздочки,
 * солнышки, баллы, полоски, «уровни» и рейтинги — это та же отметка другим шрифтом.**
 * Пятибалльную шкалу, спрятанную за смайликами, закон не разрешает.
 *
 * ЧТО ИМЕННО СТОРОЖИТ ЭТОТ ТЕСТ. Не «нет ли где слова балл» — так сторожить нельзя, слово
 * встречается в чужих смыслах. Сторожит ОДНО: экран, который показывает ученику оценку в
 * любом виде, обязан спросить `markless` — поле, которое считает сервер (`common/marking.py`).
 * Показ без вопроса и есть дефект: он покажет отметку первокласснику.
 *
 * ⚠️ ПРИБОР ПРОВЕРЯЕТ СЕБЯ (первый тест ниже). Сканеры в этом репозитории уже дважды врали:
 * один резал разметку по первому `>` внутри `icon={<X/>}`, другой читал JSDoc как код. Тест,
 * который выглядит проверкой и ею не является, — хуже отсутствующего.
 */

const SRC = join(process.cwd(), 'src');

/** Показ оценки ученику: число балла, «оценка N», значок с числом, полоска прогресса-отметки. */
const SHOWS_A_MARK = [
  /\bsp\?\.points\b/,
  /\bstudentProfile\.points\b/,
  /\.score\s*!=\s*null/,
  /t\('my\.score'/,
];

/** Вопрос, без которого показывать нельзя. */
const ASKS = /markless/i;

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'node_modules' ? [] : tsxFiles(path);
    return path.endsWith('.tsx') && !path.includes('.test.') ? [path] : [];
  });
}

/** Код без строк документации: комментарий про отметки — не показ отметки. */
function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('прибор', () => {
  it('видит показ отметки и видит вопрос о безотметочности', () => {
    const shows = "{sub?.score != null && <Badge>{t('my.score', { n: sub.score })}</Badge>}";
    expect(SHOWS_A_MARK.some((rx) => rx.test(shows))).toBe(true);
    expect(ASKS.test(shows)).toBe(false);
    expect(ASKS.test(shows.replace('sub?.score', 'sub?.markless && sub.score'))).toBe(true);
  });

  it('не считает показом упоминание в комментарии', () => {
    const commented = '/* тут раньше был sp?.points — убрали */\nreturn null;';
    expect(SHOWS_A_MARK.some((rx) => rx.test(code(commented)))).toBe(false);
  });
});

describe('дошкольники и первый класс — без отметок и без значков вместо них', () => {
  it('каждый экран, показывающий оценку, сначала спрашивает markless', () => {
    const guilty = tsxFiles(SRC)
      .filter((file) => {
        const body = code(readFileSync(file, 'utf8'));
        return SHOWS_A_MARK.some((rx) => rx.test(body)) && !ASKS.test(body);
      })
      .map((file) => file.slice(SRC.length + 1));

    expect(
      guilty,
      'экран показывает ученику оценку и не спрашивает, безотметочный ли он:\n' +
        guilty.join('\n'),
    ).toEqual([]);
  });
});
