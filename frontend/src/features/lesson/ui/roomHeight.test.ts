import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * 🔴 НИЖНИЙ ПУЛЬТ СРЕЗАЛО РОВНО НА 45 ПИКСЕЛЕЙ (наряд 47 §3).
 *
 * Комната брала высоту ОКНА (`100dvh`), а живёт она внутри рамы приложения, чей слот равен
 * `100dvh − 45px` (заголовок 44 + волосяная граница 1). Разницу срезал `overflow: hidden`,
 * и от пульта высотой ≈52 px оставалась видна верхняя половина.
 *
 * Геометрия доказана замером в живом окне (см. отчёт наряда 47): в раме комната 756 при окне
 * 800, низ пульта 780 — влезает целиком; в браузере 800 из 800. Здесь стоит то, что вообще
 * можно проверить без окна: правило не вернулось на место.
 */
const room = readFileSync(resolve(__dirname, 'roomframe.module.css'), 'utf8');
const shell = /\.shell \{[^}]*\}/.exec(room)?.[0] ?? '';
const desktop = readFileSync(
  resolve(__dirname, '../../desktop/desktop.module.css'),
  'utf8',
);

describe('высота комнаты', () => {
  it('комната берёт высоту контейнера, а не окна', () => {
    expect(shell).toContain('block-size: 100%');
    expect(shell).not.toContain('100dvh');
  });

  it('слот рамы всегда занимает последний ряд', () => {
    // Рама объявляет три ряда, а детей у неё бывает два: полоса урока рисуется не всегда.
    // Без этого слот попадал в `auto`-ряд и получал ноль — замерено.
    expect(desktop).toMatch(/grid-row: -2 \/ -1/);
  });
});
