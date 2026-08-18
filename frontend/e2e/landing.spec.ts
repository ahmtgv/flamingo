import { expect, test } from '@playwright/test';

import { proxyLiveApi } from './apiProxy';

/**
 * 🔴 КОРЕНЬ САЙТА ОТПРАВЛЯЛ ГОСТЯ НА ФОРМУ ВХОДА (наряд 35 §3.1).
 *
 * Посторонний человек открывал flamingo.plus и видел окно логина: он пришёл посмотреть, что
 * это такое, а его просили представиться. Теперь корень показывает афишу.
 *
 * ⚠️ Сценарий идёт по СОБРАННОМУ десктопному фронту, как весь прогон, — а в приложении корень
 * ведёт в мастер первого запуска (§19.4), не на афишу. Поэтому дубля оболочки здесь нет: без
 * него страница считает себя браузером, что для этой проверки и нужно.
 */
test.describe('первая страница для гостя', () => {
  test('корень показывает афишу, а не форму входа', async ({ page, baseURL }) => {
    await proxyLiveApi(page);
    await page.goto(`${baseURL ?? 'http://localhost:4180'}/`);

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Наука');
    // Пароля на первой странице быть не должно: гость ещё ничего о нас не знает.
    expect(await page.locator('input[type=password]').count()).toBe(0);
    // Вход и регистрация — в верхней строке, как на листе L2.
    await expect(page.getByRole('link', { name: 'Войти' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Регистрация' })).toBeVisible();
  });

  test('страница не прокручивается — это требование листа, а не приём вёрстки', async ({ page, baseURL }) => {
    await proxyLiveApi(page);
    await page.goto(`${baseURL ?? 'http://localhost:4180'}/`);
    const scrolls = await page.evaluate(
      () => document.documentElement.scrollHeight > window.innerHeight + 2,
    );
    expect(scrolls, 'афиша должна быть видна с одного взгляда').toBe(false);
  });
});
