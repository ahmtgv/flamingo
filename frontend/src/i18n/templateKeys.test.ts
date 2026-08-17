import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 🔴 КЛЮЧИ, СОБИРАЕМЫЕ ШАБЛОНОМ, ТОЖЕ ЖИВЫЕ (17.08).
 *
 * Дважды за сутки я удалил «мёртвый» ключ, который на самом деле читается:
 *
 *   1. `meeting:invite.modes.KNOCK_HINT` — экран строит `t(\`invite.modes.${mode}_HINT\`)`.
 *      Поймал тест соседнего экрана, случайно.
 *   2. `room:scene.boardSoon` и ещё четыре — окно второго монитора строит
 *      `t(\`scene.${known}Soon\`)`. Не поймал никто: преподаватель, вынесший доску на второй
 *      экран посреди урока, увидел бы служебную строку `scene.boardSoon` вместо текста.
 *
 * Поиск по литералам такого не видит по построению. Значит нужен обратный ход: найти в коде
 * ШАБЛОНЫ ключей, вывести из них префиксы — и запретить считать мёртвым всё, что под этот
 * префикс попадает.
 *
 * ⚠️ Тест не проверяет, что ключ используется. Он проверяет, что **ключи под шаблонным
 * префиксом существуют** — то есть что никто не выкосил их «как неиспользуемые».
 */

const LOCALES = join(process.cwd(), 'src/i18n/locales/ru');
const SRC = join(process.cwd(), 'src');

/** `t(\`invite.modes.${mode}_HINT\`)` → префикс `invite.modes.` и суффикс `_HINT`. */
const TEMPLATE = /t\(\s*`([^`$]*)\$\{[^}]+\}([^`]*)`/g;

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sources(full);
    return /\.tsx?$/.test(name) && !name.includes('.test.') ? [full] : [];
  });
}

interface Shape {
  prefix: string;
  suffix: string;
  where: string;
}

function templateShapes(): Shape[] {
  const found: Shape[] = [];
  for (const file of sources(SRC)) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(TEMPLATE)) {
      const [, prefix, suffix] = m;
      // Интересны только шаблоны с осмысленной опорой: голый `${x}` совпал бы со всем.
      if (prefix.length + suffix.length < 3) continue;
      found.push({ prefix, suffix, where: file.replace(`${SRC}/`, '') });
    }
  }
  return found;
}

function allKeys(): string[] {
  const out: string[] = [];
  const walk = (node: unknown, path: string) => {
    if (typeof node === 'string') {
      out.push(path);
      return;
    }
    if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) walk(v, path ? `${path}.${k}` : k);
    }
  };
  for (const file of readdirSync(LOCALES).filter((f) => f.endsWith('.json'))) {
    walk(JSON.parse(readFileSync(join(LOCALES, file), 'utf8')), file.slice(0, -5));
  }
  return out;
}

describe('ключи, которые собираются шаблоном', () => {
  it('в коде вообще есть такие шаблоны', () => {
    // Страховка от зелени на пустом множестве: если разбор перестанет их находить,
    // проверка ниже сойдётся сама собой и станет украшением.
    expect(templateShapes().length).toBeGreaterThan(3);
  });

  it('🔴 у каждого шаблона есть хотя бы один ключ в словаре', () => {
    const keys = allKeys();
    const orphaned = templateShapes().filter(({ prefix, suffix }) => {
      // Ключ в словаре хранится с пространством имён впереди: `room.scene.boardSoon`.
      const tail = prefix.includes(':') ? prefix.split(':')[1] : prefix;
      // ⚠️ Хвост может быть ВТОРОЙ подстановкой (`manage.filter${a}${b.slice(1)}`) — тогда
      // он не литерал, и сравнивать с ним нечего. Первая версия этого не учла и назвала
      // два исправных места сломанными: прибор врал в сторону «всё плохо», а таким верят.
      const literalSuffix = suffix.includes('${') ? '' : suffix;
      return !keys.some((k) => k.includes(tail) && (literalSuffix === '' || k.endsWith(literalSuffix)));
    });

    expect(
      orphaned.map((o) => `${o.where}: \`${o.prefix}\${…}${o.suffix}\``),
      'шаблон строит ключ, которого нет ни одного — экран покажет служебную строку вместо текста',
    ).toEqual([]);
  });

  it('🔴 именно те пять, на которых я обжёгся', () => {
    // Отдельной строкой, а не в общем счёте: их удаляли, и они должны быть на месте.
    const keys = allKeys();
    for (const key of [
      'room.scene.boardSoon',
      'room.scene.classSoon',
      'room.scene.materialSoon',
      'room.scene.testSoon',
      'room.scene.summarySoon',
      'meeting.invite.modes.KNOCK_HINT',
    ]) {
      expect(keys, `${key} читается шаблоном — удалять его нельзя`).toContain(key);
    }
  });
});
