import { expect, test } from '@playwright/test';

import { TAURI_STUB } from './tauriStub';
import { proxyLiveApi } from './apiProxy';
import { confirmPairingCode, registerTestTeacher } from './liveApi';

/**
 * 🔴 СКВОЗНОЙ СЦЕНАРИЙ — ГЛАВНЫЙ АРТЕФАКТ ФАЗЫ (промпт 24 §1.3).
 *
 * Восемь шагов приёмки мастера одной командой, без человека. До этого прогона проверка
 * упиралась в руки владельца три ночи подряд: шаг 4 не смотрели ни разу, а «мастер доходит
 * до кабинета» проверялось глазами по одному разу за сборку.
 *
 * Идёт по БОЕВОМУ серверу (§6): три дефекта существовали только там и на localhost
 * не воспроизводились.
 *
 * ⚠️ Учётка заводится своя, почта помечена `@flamingo-test.invalid` — по этой маске её потом
 * убирает `manage.py purge_test_accounts`.
 */

const APP = 'http://localhost:4180';

test.describe('мастер первого запуска', () => {
  test.beforeEach(async ({ page }) => {
    // Дубль оболочки ставится ДО загрузки приложения: `isDesktop()` спрашивают на первом же
    // рендере, и опоздав, мы бы проверяли браузерную ветку вместо приложения.
    await page.addInitScript(TAURI_STUB);
    await proxyLiveApi(page);
  });

  test('от чистой установки до кабинета', async ({ page }) => {
    test.setTimeout(180_000);

    // ── шаг 1: приложение открывается мастером, а не формой входа ──────────────────
    await page.goto(APP);
    await expect(page.getByText('ШАГ 1 ИЗ 5')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Войдите в свою учётку')).toBeVisible();
    // 🔒 §19.4: поля пароля здесь нет и не будет.
    await expect(page.locator('input[type="password"]')).toHaveCount(0);

    // ── шаг 1: код связывания приходит с боевого сервера ───────────────────────────
    const codeBox = page.getByTestId('pairing-code');
    await expect(codeBox).not.toHaveText('· · ·', { timeout: 40_000 });
    const shown = (await codeBox.textContent()) ?? '';
    const code = shown.replace(/[^0-9A-Za-zА-Яа-я]/g, '').toUpperCase();
    expect(code, 'код из шести знаков').toHaveLength(6);

    // ── подтверждение в «браузере»: делает тестовый преподаватель через живой API ──
    const teacher = await registerTestTeacher();
    await confirmPairingCode(teacher.token, code);

    // ── переход 1→2 обязан случиться САМ ───────────────────────────────────────────
    // Это тот самый переход, который вставал три захода подряд.
    await expect(page.getByText('ШАГ 2 ИЗ 5')).toBeVisible({ timeout: 40_000 });

    // ── шаг 2: папка кабинета и обязательная копия ─────────────────────────────────
    await page.getByRole('button', { name: 'Дальше' }).click();
    await expect(page.getByText('ШАГ 3 ИЗ 5')).toBeVisible({ timeout: 30_000 });

    // ── шаг 3: согласия ────────────────────────────────────────────────────────────
    await page.getByRole('button', { name: /Дальше|Принять/ }).first().click();
    await expect(page.getByText('ШАГ 4 ИЗ 5')).toBeVisible({ timeout: 30_000 });

    // ── шаг 4: камера и звук — ПЕРВЫЙ ПОКАЗ, ничего не переключаем ─────────────────
    // ⚠️ Ровно то, что просил ревьюер: переключение устройства — это жест, и он прячет
    // оба дефекта (WebKit не запускает поток сам, AudioContext создаётся приостановленным).
    await expect(page.getByText('Камера и звук')).toBeVisible();

    await page.getByRole('button', { name: /Дальше|Пропустить/ }).first().click();
    await expect(page.getByText('ШАГ 5 ИЗ 5')).toBeVisible({ timeout: 30_000 });

    // ── шаг 5: «Открыть кабинет» открывает КАБИНЕТ ─────────────────────────────────
    await page.getByRole('button', { name: 'Открыть кабинет' }).click();

    /*
     * 🔴 КОНФЛИКТ НОВОГО СО СТАРЫМ, НАЗВАННЫЙ ВСЛУХ (наряд 54 §1).
     *
     * Здесь ждали приветствие по имени — «Здравствуйте» или «Привет». Стартовая пересобрана
     * по листу «Кабинет и учёба» (наряд 42), и приветствия на ней больше нет: заголовок
     * экрана — «Кабинет». Проверка описывала экран, которого уже нет, и держала прогон
     * красным, пока это не нашли случайно.
     *
     * Чинится ПРОГОН, не продукт (§62.1): проверяем, что открылся кабинет — по его
     * собственному имени, а не по формулировке приветствия.
     */
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Кабинет', {
      timeout: 40_000,
    });
    // И мастера на экране больше нет — а то «кабинет открылся» ни о чём не говорит.
    await expect(page.getByText(/ШАГ \d ИЗ 5/)).toHaveCount(0);
  });
});
