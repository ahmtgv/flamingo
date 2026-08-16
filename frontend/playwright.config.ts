import { defineConfig, devices } from '@playwright/test';

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
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
