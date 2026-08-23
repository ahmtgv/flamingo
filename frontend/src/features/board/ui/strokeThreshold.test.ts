import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * 🔴 СЛУЧАЙНОЕ ДВИЖЕНИЕ МЫШЬЮ НЕ ПАЧКАЕТ УРОК НАВСЕГДА (наряд 47 §5).
 *
 * Порог был «две точки»: любое протаскивание по холсту — и постоянный элемент, который нечем
 * убрать (очистки доски нет ни в одной мутации). На новом курсе с нулём учеников доска
 * оказалась покрыта штрихами, которых никто не рисовал.
 *
 * Проверяется сама мера, а не отрисовка: холст в jsdom не рисуется, а правило — арифметика.
 */
const src = readFileSync(resolve(__dirname, 'BoardCanvas.tsx'), 'utf8');
const body = /function isRealStroke[\s\S]*?\n}/.exec(src)?.[0] ?? '';
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const isRealStroke = new Function(
  `${body.replace('function isRealStroke(stroke: number[] | null): stroke is number[]', 'function isRealStroke(stroke)')}
   const MIN_STROKE_POINTS = 3, MIN_STROKE_LENGTH = 6;
   return isRealStroke;`,
)() as (s: number[] | null) => boolean;

describe('порог штриха', () => {
  it('дрожание на три пикселя штрихом не считается', () => {
    expect(isRealStroke([100, 100, 102, 101])).toBe(false);
    expect(isRealStroke([100, 100, 101, 100, 102, 100])).toBe(false);
  });

  it('две точки — не штрих, сколько бы их ни развело', () => {
    // Прежний порог пропускал ровно это.
    expect(isRealStroke([0, 0, 500, 500])).toBe(false);
  });

  it('осмысленная линия проходит', () => {
    const line = [];
    for (let i = 0; i < 20; i += 1) line.push(i * 4, i * 2);
    expect(isRealStroke(line)).toBe(true);
  });

  it('пусто и одна точка — не штрих', () => {
    expect(isRealStroke(null)).toBe(false);
    expect(isRealStroke([10, 10])).toBe(false);
  });
});
