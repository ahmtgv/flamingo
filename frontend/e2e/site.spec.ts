import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * Открытые маршруты сайта: доходимость, отказы и доступность — машиной.
 *
 * 🔴 Раздел В3/В5 промпта 24. До сих пор это проверялось глазами по одному адресу за раз,
 * и «прямой заход по адресу» ломался дважды: терялся `next` при уходе на вход, а `/link`
 * жил без `<main>` — та самая страница, на которую приложение само присылает преподавателя.
 */

const ROUTES = [
  ['/start', 'стартовая'],
  ['/login', 'вход'],
  ['/register', 'выбор роли'],
  ['/register/teacher', 'регистрация преподавателя'],
  ['/link', 'подтверждение машины'],
  ['/sources', 'источники'],
  ['/verify', 'проверка сертификата'],
] as const;

test.describe('прямой заход по адресу', () => {
  for (const [path, name] of ROUTES) {
    test(`${name} (${path}) открывается и не пуст`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));

      const response = await page.goto(path);

      expect(response?.status(), 'сервер отдал страницу').toBeLessThan(400);
      // Пустой экран — тоже поломка: человек по ссылке из письма приходит именно сюда.
      await expect(page.locator('body')).not.toBeEmpty();
      expect(errors, 'ошибок в консоли быть не должно').toEqual([]);
    });
  }
});

test.describe('доступность', () => {
  for (const [path, name] of ROUTES) {
    test(`${name} (${path}) — axe`, async ({ page }) => {
      await page.goto(path);
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const named = violations.map((v) => `${v.id}/${v.impact}×${v.nodes.length}`);
      expect(named, `нарушения на ${path}`).toEqual([]);
    });
  }
});
