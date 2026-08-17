import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 🔴 «НАРИСОВАНО И МОЛЧИТ» — ЧЕТВЁРТОГО СОСТОЯНИЯ БЫТЬ НЕ ДОЛЖНО (промпт 27 §1.3).
 *
 * У элемента допустимы ровно три состояния:
 *   работает · отсутствует · **выключено с честной подписью**.
 *
 * Четвёртое — нарисовано, включено, нажимается и ничего не делает — за август встречалось
 * четыре раза: «Открыть кабинет» замыкал круг в мастер, шестерёнка рамы не имела обработчика,
 * шаги 2–5 мастера молчали на отказе, «▶» у слова в словаре не имела обработчика вовсе и
 * звука за ней не было ни на сервере, ни где-либо ещё.
 *
 * Каждый раз человек решал, что сломался он. Поэтому правило: **кнопка без обработчика обязана
 * быть `disabled`** — тогда рядом стоит подпись, и молчание становится сказанным вслух.
 *
 * ⚠️ ЧЕГО ЭТОТ СТОРОЖ НЕ УМЕЕТ, и это важнее того, что умеет. Он читает разметку, а не граф
 * вызовов: `onClick={props.onOpen}` для него «обработчик есть», хотя проп могли не передать —
 * ровно дефект «Открыть кабинет» 15.08. Он ловит самый грубый случай, а не все четыре.
 */

const SRC = join(process.cwd(), 'src');

/**
 * Комментарии — не разметка.
 *
 * ⚠️ Прибор поймал `<button>` внутри JSDoc-строки `VideoTile.tsx:12` и назвал его молчащим.
 * Это второй раз, когда сторож ошибся В СТОРОНУ «ВСЁ ПЛОХО»: сначала резал тег по `>` внутри
 * `icon={<…/>}`, теперь читал текст описания как код. Такому верят и правят исправное.
 */
function withoutComments(text: string): string {
  // Заменяем на пробелы той же длины — номера строк обязаны остаться прежними, иначе
  // сторож укажет не на ту строку, и человек пойдёт искать несуществующее.
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, head: string) => head + ' '.repeat(m.length - head.length));
}

/** Открывающий тег целиком. Конец ищем со счётом `{}`, а НЕ по первому `>`. */
function tags(text: string, name: string): { at: number; tag: string }[] {
  const out: { at: number; tag: string }[] = [];
  const needle = `<${name}`;
  let i = 0;
  for (;;) {
    i = text.indexOf(needle, i);
    if (i < 0) return out;
    const after = text[i + needle.length] ?? '';
    if (/[\w-]/.test(after)) {
      i += needle.length;
      continue;
    }
    let depth = 0;
    let j = i + needle.length;
    for (; j < text.length; j++) {
      const ch = text[j];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      else if (ch === '>' && depth === 0) break;
    }
    out.push({ at: i, tag: text.slice(i, j + 1) });
    i = j + 1;
  }
}

function screens(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return screens(full);
    return /\.tsx$/.test(name) && !name.includes('.test.') ? [full] : [];
  });
}

function silent(): string[] {
  const found: string[] = [];
  for (const file of screens(SRC)) {
    // Витрина рисует неживые экраны намеренно, у неё другой договор.
    if (file.includes('/demo/')) continue;
    const text = withoutComments(readFileSync(file, 'utf8'));
    for (const name of ['button', 'Button']) {
      for (const { at, tag } of tags(text, name)) {
        const acts = /onClick|onPointerDown|onMouseDown|onChange/.test(tag);
        const submits = tag.includes('submit');
        const off = /\bdisabled\b/.test(tag);
        // Сам компонент `Button` раздаёт пропы дальше — у него обработчика и не должно быть.
        const isTheComponentItself = file.endsWith('shared/ui/Button/Button.tsx');
        if (!acts && !submits && !off && !isTheComponentItself) {
          found.push(`${file.replace(`${SRC}/`, '')}:${text.slice(0, at).split('\n').length}`);
        }
      }
    }
  }
  return found;
}

describe('кнопка, которая ничего не делает', () => {
  it('🔴 сам разбор умеет показать И «молчит», И «работает»', () => {
    // Страховка от зелени на пустом множестве. Первая версия этого прибора резала тег по
    // первому `>` — а он есть ВНУТРИ `icon={<Video />}` — и объявляла молчащими одиннадцать
    // исправных кнопок. Прибор, ошибающийся в сторону «всё плохо», опаснее отсутствующего.
    const mute = '<button type="button" className={x}>текст</button>';
    const live = '<Button icon={<Video size={ICON_SM} />} onClick={() => go()}>ок</Button>';
    expect(tags(mute, 'button')[0].tag).not.toMatch(/onClick/);
    expect(tags(live, 'Button')[0].tag).toMatch(/onClick/);
    // …и не путает описание с кодом: в JSDoc `VideoTile` слово `<button>` стоит в тексте.
    const inComment = '/** роль такова, что плитка становится <button> */\nconst a = 1;';
    expect(tags(withoutComments(inComment), 'button')).toEqual([]);
    // При этом номера строк не съезжают — иначе сторож укажет мимо.
    expect(withoutComments(inComment).split('\n').length).toBe(2);
  });

  it('🔴 у каждой кнопки есть обработчик — либо она выключена и подписана', () => {
    expect(
      silent(),
      'кнопка нарисована, включена и ничего не делает: человек решит, что сломался он',
    ).toEqual([]);
  });
});
