import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * 🔴 АФИША НЕ ИМЕЕТ ПРАВА ЗВАТЬ ТУДА, КУДА ГОСТЯ НЕ ПУСКАЮТ.
 *
 * Найдено на пустой базе (наряд 40-бис §4): «Источники мира» и «Предметы» стояли в верхней
 * строке афиши — и обе вели на форму входа. Посторонний приходил посмотреть на продукт и
 * упирался в «представьтесь» с первого же нажатия.
 *
 * Прежняя проверка сайта это пропускала: она смотрела «страница открылась и не пуста», а
 * форма входа — непустая страница. Поэтому караул сравнивает не вид, а СМЫСЛ: каждая ссылка
 * афиши против списка защищённых маршрутов.
 *
 * Разбор исходника, а не отрисовка, — намеренно: так под охраной оказываются и те ссылки,
 * которые на афишу добавят завтра, ничего здесь не дописывая.
 */
const src = (p: string) => readFileSync(resolve(__dirname, '..', '..', p), 'utf8');

/** Куда зовёт афиша: `<Link to="/…">`. Внешние адреса и якоря не наше дело. */
function landingLinks(): string[] {
  const html = src('features/landing/ui/LandingScreen.tsx');
  const found = [...html.matchAll(/<Link\s+to="(\/[^"]*)"/g)].map((m) => m[1]);
  return [...new Set(found)];
}

/** Маршруты за `ProtectedRoute`. Разбираем по кускам `<Route …>`: каждый кусок несёт свой path. */
function protectedPaths(): Set<string> {
  const router = src('app/router.tsx');
  const out = new Set<string>();
  for (const chunk of router.split('<Route').slice(1)) {
    const path = /path="([^"]+)"/.exec(chunk)?.[1];
    if (path && chunk.includes('ProtectedRoute')) out.add(path);
  }
  return out;
}

describe('двери с афиши', () => {
  it('ни одна ссылка афиши не ведёт на стену входа', () => {
    const walled = landingLinks().filter((href) => protectedPaths().has(href));
    expect(walled, `афиша зовёт гостя туда, где требуют войти: ${walled.join(', ')}`).toEqual([]);
  });

  it('прибор видит и афишу, и защищённые маршруты — иначе проверка пуста', () => {
    // Без этого тест проходил бы на пустых списках: молчание прибора ≠ отсутствие дефекта.
    expect(landingLinks().length).toBeGreaterThan(4);
    expect(protectedPaths().size).toBeGreaterThan(10);
  });
});
