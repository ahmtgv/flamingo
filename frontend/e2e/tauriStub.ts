/**
 * Дубль оболочки Tauri для прогона в WebKit.
 *
 * 🔴 ЗАЧЕМ ОН ВООБЩЕ НУЖЕН (промпт 24 §1.1). `tauri-driver` на macOS не работает:
 *
 *     $ tauri-driver
 *     tauri-driver is not supported on this platform
 *
 * В исходниках крейта видно почему: `WebKitWebDriver` для Linux, `msedgedriver.exe` для
 * Windows — ветки для macOS нет вовсе, потому что у WKWebView нет WebDriver. Значит войти
 * внутрь настоящего окна приложения нечем, и его придётся заменить.
 *
 * Замена — **WebKit от Playwright**: тот же движок, что внутри приложения. Это важнее, чем
 * кажется: два последних дефекта (серое превью и мёртвая полоса уровня) были ИМЕННО
 * особенностями WebKit — он не запускает поток сам и создаёт AudioContext приостановленным.
 * В Chromium они не воспроизводятся, то есть проверка в Chromium их бы и не нашла.
 *
 * ⚠️ ЧЕГО ЭТОТ ДУБЛЬ НЕ ПРОВЕРЯЕТ, и это надо держать в голове:
 * настоящую связку ключей, сайдкар, трей, окно. Всё это живёт в Rust и проверяется своими
 * тестами (`tests/keychain_is_real.rs`). Здесь проверяется ВЕБ-ЧАСТЬ приложения — та, где
 * за трое суток нашлись почти все дефекты.
 *
 * 🔒 Дубль не ослабляет защиту: он не подменяет ключи в настоящей связке и не отключает
 * проверок. Ключ живёт в памяти страницы ровно столько, сколько живёт прогон.
 */

/** Что оболочка умеет и что дубль обязан уметь вместо неё. */
export interface StubState {
  /** Ключ машины «в связке» — на самом деле в памяти страницы. */
  machineKey: string | null;
  /** Что вызывали — чтобы тест мог спросить «а вызывали ли вообще». */
  calls: string[];
}

/**
 * Код, который выполняется В СТРАНИЦЕ до загрузки приложения.
 *
 * Пишется строкой, а не функцией из модуля: Playwright сериализует его и исполняет в другом
 * процессе, где ни импортов, ни замыканий отсюда не существует.
 */
export const TAURI_STUB = `
(() => {
  const state = { machineKey: null, calls: [] };
  window.__FLAMINGO_STUB__ = state;

  window.__TAURI_INTERNALS__ = {
    invoke: async (cmd, args) => {
      state.calls.push(cmd);
      switch (cmd) {
        // 🔒 Связка ключей — в памяти страницы. Настоящую здесь не трогаем и трогать нельзя.
        case 'store_machine_key':
          state.machineKey = args && args.token ? args.token : null;
          return null;
        case 'read_machine_key':
          return state.machineKey;
        case 'has_machine_key':
          return state.machineKey !== null;
        case 'forget_machine_key':
          state.machineKey = null;
          return null;

        // Окно и трей: приложению важен только факт, что вызов не упал.
        case 'minimise_window':
        case 'set_tray_label':
        case 'set_tray_menu':
          return null;

        // Внешний браузер: адрес запоминаем, но НЕ открываем — иначе прогон утащит
        // владельца в Safari посреди ночи.
        case 'open_external':
          state.lastExternalUrl = args && args.url;
          return null;

        case 'copy_text':
          state.clipboard = args && args.text;
          return null;

        // Папка кабинета: в прогоне её нет, отвечаем правдоподобным путём.
        case 'choose_backup_destination':
        case 'backup_destination':
          return '/tmp/flamingo-e2e/Кабинет';

        default:
          // ⚠️ Неизвестная команда — НЕ молча. Иначе дубль будет тихо отвечать undefined
          // на то, чего не умеет, и прогон покажет зелёное там, где приложение сломано.
          state.calls.push('НЕИЗВЕСТНАЯ:' + cmd);
          return null;
      }
    },
  };
})();
`;
