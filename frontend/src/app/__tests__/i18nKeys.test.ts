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

/**
 * 🔴 СТОРОЖ ПРОПУСКАЛ ИМЕННО ТО, ЧТО ДОЛЖЕН ЛОВИТЬ (наряд 49 §7).
 *
 * Проверка выше засчитывает ключ, если есть ЛИБО голый ключ, ЛИБО любая из форм. Значит
 * `"cardLessons": "{{count}} уроков"` — голая строка со счётчиком — считалась в порядке,
 * и человек читал «1 уроков». Так прошли восемь ключей.
 *
 * Правило теперь такое: **строка, подставляющая `{{count}}`, обязана иметь формы.** Голого
 * ключа мало — он и есть поломка.
 *
 * ⚠️ И отдельно: `{{days}}`, `{{n}}`, `{{minutes}}` i18next склонить не может физически —
 * он смотрит ТОЛЬКО на переменную `count`. Такие строки ловятся вторым правилом.
 */
const DECLINES = /^(дней|дня|день|раза|раз|минут|минуты|уроков|урока|работ|работы|учеников|ученика|ученикам|вопросов|вопроса|дел|дела|участников|участника|курсов|курса|занятий|занятия)$/i;

function countKeysWithoutForms(dict: Record<string, unknown>, prefix = ''): string[] {
  const bad: string[] = [];
  for (const [key, value] of Object.entries(dict)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') {
      bad.push(...countKeysWithoutForms(value as Record<string, unknown>, path));
      continue;
    }
    if (typeof value !== 'string') continue;
    if (PLURALS.some((suffix) => key.endsWith(suffix))) continue; // это и есть форма
    /*
     * Формы нужны там, где число УПРАВЛЯЕТ словом: «{{count}} уроков». Строки вида
     * «в группе: {{count}}», «+{{count}}», «{{count}} мин» склонять нечего — требовать
     * от них тройку значит завести сторожа, который кричит на исправное.
     *
     * ⚠️ Слово вынимается и сравнивается ПРЯМО, без сборки регулярного выражения из чужого
     * `source`: первая версия собирала его из `DECLINES.source` и не ловила ничего вовсе —
     * поймано нарочной поломкой, а не чтением.
     */
    const after = /\{\{\s*count\s*\}\}\s+([а-яё]+)/i.exec(value);
    if (after && DECLINES.test(after[1])) {
      const table = dict as Record<string, unknown>;
      const hasForms = PLURALS.some((suffix) => table[key + suffix] !== undefined);
      if (!hasForms) bad.push(`${path} = «${value}»`);
    }
  }
  return bad;
}

/**
 * Переменные, которые выглядят счётчиком, но склонены быть не могут.
 *
 * ⚠️ Узко и намеренно. Первая версия ловила «{{done}} из {{total}} пройдено» и «{{n}} мин» —
 * а там склонять нечего: после «из» форма постоянная, «мин» не склоняется вовсе. Сторож,
 * который кричит на исправное, перестают читать, и он становится хуже отсутствующего.
 *
 * Ловим один случай: число УПРАВЛЯЕТ существительным, которое обязано менять форму.
 */

function fakeCounters(dict: Record<string, unknown>, prefix = ''): string[] {
  const bad: string[] = [];
  for (const [key, value] of Object.entries(dict)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') {
      bad.push(...fakeCounters(value as Record<string, unknown>, path));
      continue;
    }
    if (typeof value !== 'string') continue;
    for (const m of value.matchAll(/(из\s+|\/)?\{\{\s*(\w+)\s*\}\}\s+([а-яё]+)/gi)) {
      // «из {{total}} занятий» и «{{done}}/{{total}} занятий» — форма постоянная в обоих.
      if (m[1]) continue;
      if (m[2] === 'count') continue;
      if (!DECLINES.test(m[3])) continue;
      bad.push(`${path} = «${value}» (переменная ${m[2]}, а склоняет только count)`);
    }
  }
  return bad;
}

describe('строки интерфейса', () => {
  const files = walk(SRC);

  it('прибор смотрит на весь src и на все словари', () => {
    expect(files.length).toBeGreaterThan(100);
    expect(readdirSync(LOCALES).filter((f) => f.endsWith('.json')).length).toBeGreaterThan(5);
  });

  it('🔴 строка со счётчиком имеет формы, а не одну на все числа', () => {
    const bad: string[] = [];
    for (const name of readdirSync(LOCALES).filter((f) => f.endsWith('.json'))) {
      const dict = JSON.parse(readFileSync(join(LOCALES, name), 'utf8')) as Record<string, unknown>;
      bad.push(...countKeysWithoutForms(dict).map((x) => `${name}: ${x}`));
    }
    expect(bad, `«1 уроков» — ключи со счётчиком без форм:\n${bad.join('\n')}`).toEqual([]);
  });

  it('🔴 счётчик подставляется переменной `count` — другую i18next не склоняет', () => {
    const bad: string[] = [];
    for (const name of readdirSync(LOCALES).filter((f) => f.endsWith('.json'))) {
      const dict = JSON.parse(readFileSync(join(LOCALES, name), 'utf8')) as Record<string, unknown>;
      bad.push(...fakeCounters(dict).map((x) => `${name}: ${x}`));
    }
    expect(bad, `число рядом со словом, но не через count:\n${bad.join('\n')}`).toEqual([]);
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
