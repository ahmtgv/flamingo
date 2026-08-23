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

/**
 * Четыре места, где коралл законен, — и разрешение выдаётся СТРОКОЙ, а не файлом (§62.5).
 *
 * 🔴 Наряд 50 освобождал файлами, и внутри освобождённого файла коралл был разрешён везде.
 * Владелец разрешал четыре ВЕЩИ, а не четырнадцать файлов — и шесть мест уехали в щель:
 * пилюля «идёт», включённый микрофон, рамка говорящего, свои сообщения, бейдж «сейчас».
 *
 * Это третий случай одного промаха подряд: `staleTokens.OLD_LAYER` освобождал файлами,
 * `i18nKeys` засчитывал голый ключ, здесь — файл целиком. Поэтому:
 *
 *   • файл целиком освобождается ТОЛЬКО там, где весь файл и есть разрешённое;
 *   • везде иначе — пара «файл + селектор»; коралл вне названного селектора роняет тест.
 */
const WHOLE_FILES = [
  // Знак бренда — файл целиком про него.
  'shared/ui/Logo/',
  'shared/ui/BrandMark/',
  // Тревога — эти файлы целиком про отказ и потерю связи.
  'shared/ui/ErrorState/',
  'shared/ui/ErrorBoundary/',
  'shared/ui/ConnectionLine/',
  // Определения самих токенов.
  'shared/styles/tokens.css',
];

/**
 * Файл → селекторы (или явные строки), где коралл разрешён. Всё, что в этом файле мимо
 * списка, — дефект.
 */
const BY_SELECTOR: Record<string, string[]> = {
  // Тревога внутри общих состояний.
  'shared/ui/StateCard/stateCard.module.css': [
    ".card[data-kind='failed']",
    ".card[data-kind='partial']",
    '.failed',
    '.partial',
    '.head',
    '.mark',
  ],
  // `.danger` — «Завершить», «Отмена», «Удалить», «Отклонить», «Выйти».
  'shared/ui/Button/Button.module.css': ['.danger'],
  // Показатель внимания: коралл — «внимание ушло», ровно то, ради чего он и рисуется.
  // `.meterFill` — сама шкала внимания: коралл здесь и есть «внимание ушло».
  'seedum/ui/seedum.module.css': ['.alert', '.privacy', '.low', '.meterFill'],
  'seedum/ui/AttentionChart.tsx': ['stroke='],
  // Поднятая рука и отказ на плитке.
  'features/lesson/ui/classpane.module.css': ['.hand'],
  // `.tileWarn` — плашка «плохая связь» на плитке: та же тревога.
  'features/lesson/ui/videoroom.module.css': [
    '.tile[data-alert',
    '.focusAlert',
    '.leaveBtn',
    '.tileWarn',
  ],
  // Уход из комнаты — коралловый по правилу.
  'features/lesson/ui/roomframe.module.css': ['.leave', '.exit', '.logoBtn'],
  // ⚠️ СПОРНОЕ, оставлено как есть и возвращено вопросом владельцу (§51 §1): счётчик
  // непрочитанного и громкий бейдж — это счётчики, а не тревога.
  'features/chat/ui/chat.module.css': ['.fabCount', '.badge'],
  'shared/ui/Badge/Badge.module.css': ['.loud'],
};

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
      if (WHOLE_FILES.some((ok) => rel.startsWith(ok))) continue;
      const allowed = BY_SELECTOR[rel];
      const lines = readFileSync(file, 'utf8').split('\n');
      /*
       * Селектор действует до конца своего правила: коралл внутри `.hand { … }` законен,
       * а в соседнем правиле того же файла — нет. Поэтому идём построчно и помним,
       * в каком правиле находимся.
       */
      let inAllowedRule = false;
      lines.forEach((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('*') || trimmed.startsWith('//')) return;
        if (allowed && /\{\s*$/.test(trimmed)) {
          inAllowedRule = allowed.some((sel) => trimmed.includes(sel));
        } else if (trimmed === '}') {
          inAllowedRule = false;
        }
        if (allowed && !/\.(css)$/.test(rel)) {
          // В `.tsx` правил нет — разрешаем строку, если в ней есть разрешённая подстрока.
          if (allowed.some((sel) => line.includes(sel))) return;
        } else if (inAllowedRule) {
          return;
        }
        if (CORAL.test(line)) guilty.push(`${rel}:${i + 1}  ${trimmed.slice(0, 70)}`);
      });
    }
    expect(
      guilty,
      `коралл вне разрешённых СЕЛЕКТОРОВ (можно: знак бренда · тревога · «Завершить» · «Отмена»):\n${guilty.join('\n')}`,
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
