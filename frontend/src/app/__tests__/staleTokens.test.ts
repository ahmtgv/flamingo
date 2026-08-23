import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * 🔴 УСТАРЕВШИЕ ИМЕНА ТОКЕНОВ НЕ ПОПАДАЮТ В НОВЫЙ КОД (правило дизайнера 4.11).
 *
 * `--color-text-tertiary` называл МЕСТО В ИЕРАРХИИ, а порог контраста стоит на
 * ОБЯЗАТЕЛЬНОСТИ ПРОЧТЕНИЯ. Я втянулся в эту воронку трижды подряд, и каждый раз прибор
 * ловил 4,33 при пороге 4,5 — уже после того, как экран был сдан.
 *
 * Алиас оставлен ради СТАРОГО слоя и умрёт вместе с ним. Список исключений ниже — это ровно
 * то, что ещё не пересобрано; он обязан только убывать. Пересобрал экран — вычеркнул строку.
 */
const SRC = resolve(__dirname, '..', '..');

/**
 * Файлы старого слоя, где алиас пока законен.
 *
 * ⚠️ Добавлять сюда новые строки НЕЛЬЗЯ. Если проверка красная на файле, которого здесь нет,
 * — это новый код, и в нём выбирают между `hint` и `detail` по вопросу «что будет, если это
 * не прочитают».
 */
const OLD_LAYER = [
  'shared/styles/tokens.css',
  'features/account/ui/account.module.css',
  'features/admin/ui/admin.module.css',
  'features/board/ui/board.module.css',
  'features/cabinet/ui/cabinet.module.css',
  'features/chat/ui/chat.module.css',
  'features/desktop/desktop.module.css',
  'features/desktop/settings.module.css',
  'features/desktop/setup/setup.module.css',
  'features/desktop/ui/linkMachine.module.css',
  'features/dictionary/ui/dictionary.module.css',
  'features/exercises/ui/test.module.css',
  'features/homework/ui/homework.module.css',
  'features/landing/ui/landing.module.css',
  'features/lesson/ui/liveroom.module.css',
  'features/lesson/ui/videoroom.module.css',
  'features/meeting/ui/arrival.module.css',
  'features/meeting/ui/invite.module.css',
  'features/repetition/ui/repetition.module.css',
  'features/schedule/ui/schedule.module.css',
  'features/sources/ui/sources.module.css',
  'features/summary/ui/summary.module.css',
  'seedum/ui/seedum.module.css',
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return name === 'node_modules' ? [] : walk(full);
    /*
     * 🔴 §49.8: обход смотрел ТОЛЬКО `.css`, и `var(--color-text-tertiary)`, написанный
     * прямо в разметке, проходил мимо (`shared/demo/DemoRoleSwitcher.tsx:51`). Токен —
     * это про цвет, а не про расширение файла.
     */
    return full.endsWith('.css') || full.endsWith('.tsx') ? [full] : [];
  });
}

describe('устаревшие токены', () => {
  const files = walk(SRC);

  it('прибор смотрит на все стили, а не на пустой список', () => {
    expect(files.length).toBeGreaterThan(30);
  });

  it('🔴 `--color-text-tertiary` не появляется в пересобранных экранах', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const rel = file.slice(SRC.length + 1);
      if (OLD_LAYER.includes(rel)) continue;
      const text = readFileSync(file, 'utf8');
      const count = text.split('--color-text-tertiary').length - 1;
      if (count > 0) offenders.push(`${rel}: ${count}`);
    }
    expect(
      offenders,
      `устаревшее имя в новом коде (выберите hint или detail по вопросу «что будет, если это не прочитают»):\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  it('список исключений не растёт молча — каждый файл в нём существует', () => {
    // Строка про несуществующий файл означает, что экран пересобран, а запись осталась:
    // тогда список перестаёт убывать и превращается в вечное разрешение.
    const missing = OLD_LAYER.filter((rel) => !files.includes(join(SRC, rel)));
    expect(missing, `в списке старого слоя есть исчезнувшие файлы:\n${missing.join('\n')}`).toEqual(
      [],
    );
  });

  it('🔴 в списке нет файлов, которые уже чисты', () => {
    /*
     * ТРЕТЬЯ ДЫРА, И САМАЯ ТИХАЯ (§49.8). Проверка выше смотрела только на СУЩЕСТВОВАНИЕ
     * файла, а не на наличие в нём токена. Пять записей были чисты и не вычеркнуты —
     * список перестал убывать, оставаясь зелёным. Комментарий в шапке предупреждал ровно
     * об этом и сам себя не проверил.
     */
    const clean = OLD_LAYER.filter((rel) => {
      const full = join(SRC, rel);
      if (!files.includes(full)) return false; // это ловит проверка выше
      return !readFileSync(full, 'utf8').includes('--color-text-tertiary');
    });
    expect(
      clean,
      `эти файлы уже чисты — вычеркните их из OLD_LAYER, иначе список не убывает:\n${clean.join('\n')}`,
    ).toEqual([]);
  });
});
