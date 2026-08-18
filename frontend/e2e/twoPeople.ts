import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Урок на двоих: вход формой, доска, штрих, счёт штрихов.
 *
 * 🔴 ОДИН НАБОР НА ДВА ПРОГОНА (промпт 34 §1.1). Эти шаги были внутри `rnd.spec.ts` —
 * наблюдательного захода под флагом. Теперь тем же ходит и обычный прогон (`live.spec.ts`),
 * и второй копии быть не должно: две копии расходятся, и первой расходится та, которую
 * запускают реже.
 */

/** Войти формой, как человек: набрать почту и пароль и нажать кнопку. */
export async function signIn(page: Page, base: string, email: string, password: string): Promise<void> {
  await page.goto(`${base}/login`);
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.locator('input[type=password]').fill(password);
  await page.getByRole('button', { name: 'Войти' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20_000 });
}

/** Что человек видит прямо сейчас — коротко, для журнала наблюдений. */
export async function seen(page: Page, limit = 160): Promise<string> {
  return (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, limit);
}

export async function openBoard(page: Page, base: string, sessionId: string): Promise<void> {
  await page.goto(`${base}/sessions/${sessionId}/room`);
  await page.getByRole('tab', { name: 'Доска' }).click();
  await page.waitForSelector('[role=toolbar]', { timeout: 20_000 });
}

/** Нарисовать штрих пером — тем же путём, что рука преподавателя. */
export async function drawStroke(page: Page, from: { x: number; y: number }): Promise<void> {
  const surface = page.locator('[class*=surface]').first();
  const box = await surface.boundingBox();
  if (!box) throw new Error('холста нет');
  await page.mouse.move(box.x + from.x, box.y + from.y);
  await page.mouse.down();
  await page.mouse.move(box.x + from.x + 40, box.y + from.y + 30, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(400);
}

/**
 * Сколько ШТРИХОВ на доске. Только `<path>` внутри холста.
 *
 * ⚠️ Первый вариант считал `svg path, svg rect, svg image` по всей странице — и в счёт
 * попадали значки интерфейса и МАРКЕРЫ ВЫДЕЛЕНИЯ у того, кто рисовал последним. Из-за них
 * у преподавателя выходило 24 против 15 у ученика, и я чуть не записал в дефекты
 * несошедшиеся доски, хотя расходились приборы, а не картины.
 */
export async function strokeCount(page: Page): Promise<number> {
  return page.evaluate(() => document.querySelectorAll('[class*=surface] svg path').length);
}

/**
 * 🔴 ПРИБОР ОБЯЗАН ПРОВЕРИТЬ СЕБЯ ПЕРЕД ЗАМЕРОМ.
 *
 * Прошлой ночью такой же сценарий прошёл зелёным и не измерил ничего: ученик не был
 * авторизован, и «обрыв» наблюдался на форме входа. Здесь — оба на доске, у обоих холст.
 */
export async function bothAtTheBoard(teacher: Page, pupil: Page): Promise<void> {
  expect(await teacher.locator('[role=toolbar]').count()).toBeGreaterThan(0);
  expect(await pupil.locator('[role=toolbar]').count()).toBeGreaterThan(0);
}
