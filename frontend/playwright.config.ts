import { defineConfig, devices } from '@playwright/test';

import { CIRCUIT_PORT } from './e2e/testCircuit';

/**
 * 🔴 WEBKIT, А НЕ CHROMIUM — и это не вкусовщина (промпт 24 §1.1).
 *
 * Внутри приложения WKWebView. Два последних дефекта — серое превью и мёртвая полоса
 * уровня — были ИМЕННО особенностями WebKit: он не запускает медиапоток сам и создаёт
 * `AudioContext` приостановленным. В Chromium оба не воспроизводятся, то есть прогон
 * в Chromium прошёл бы зелёным на сломанном экране.
 *
 * `tauri-driver` был бы точнее, но на macOS его нет:
 *     $ tauri-driver
 *     tauri-driver is not supported on this platform
 * (в крейте ветки только для WebKitWebDriver/Linux и msedgedriver/Windows).
 */
export default defineConfig({
  testDir: './e2e',
  /**
   * 🔴 ПРОГОН ПОДНИМАЕТ СВОЙ КОНТУР САМ (промпт 29 §2).
   *
   * Раньше он ходил на боевой сервер и заводил там учётку каждый проход. Теперь
   * `globalSetup` поднимает отдельную базу и отдельный порт и выставляет `FLAMINGO_API`
   * на них; `globalTeardown` сносит базу.
   *
   * ⚠️ Ручной способ НЕ СЛОМАН: задайте `FLAMINGO_API` сами — и прогон пойдёт туда, куда
   * вы сказали, включая боевой. Контур поднимается, только если переменной нет.
   */
  globalSetup: './e2e/globalSetup.ts',
  globalTeardown: './e2e/globalTeardown.ts',
  timeout: 180_000,
  // Прогон ходит на боевой сервер: параллельные попытки связывания мешают друг другу.
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4180',
    ...devices['Desktop Safari'],
    // Размер окна приложения из tauri.conf.json: экран обязан умещаться без прокрутки,
    // и проверять это надо на том размере, с которым приложение открывается.
    viewport: { width: 1280, height: 860 },
    // 🔒 Разрешения выдаём заранее: системного окна в прогоне нет, а без них шаг 4
    // ушёл бы в ветку «доступ запрещён» и проверял бы не то.
    permissions: ['camera', 'microphone'],
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    // Отдаём собранный десктопный фронт — тот же ассет, что вшит в приложение.
    // ⚠️ \`--host 127.0.0.1\` обязателен: без него vite слушает только IPv6 (\`[::1]\`), и
    // Playwright, ходящий на 127.0.0.1, ждёт сервер до таймаута на полностью рабочем сервере.
    command: 'npx vite preview --mode desktop --port 4180 --strictPort --host 127.0.0.1',
    url: 'http://localhost:4180',
    /**
     * ⚠️ ПЕРЕМЕННУЮ ЗАДАЁМ ЗДЕСЬ, А НЕ В `globalSetup`. Playwright поднимает `webServer`
     * РАНЬШЕ, чем зовёт `globalSetup`, — процесс preview просто не увидел бы её. Из-за
     * этого половина сценария шла на контур, половина на рабочий сервер, и код связывания
     * заводился на одном, а искался на другом: «Pairing code not found» на исправном коде.
     * Порт контура постоянный, поэтому адрес известен заранее.
     */
    env: {
      // Прокси preview — для браузерной половины; сам мастер ходит по вшитому адресу через
      // перехватчик, см. e2e/apiProxy.ts.
      VITE_PROXY_TARGET: process.env.FLAMINGO_API
        ? process.env.FLAMINGO_API.replace(/\/graphql\/?$/, '')
        : `http://127.0.0.1:${CIRCUIT_PORT}`,
    },
    // Сервер поднимаем СВОЙ: чужой, оставшийся от прошлого запуска, смотрит в другую сторону.
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
