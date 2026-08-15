/**
 * СГЕНЕРИРОВАНО. Не править руками.
 *
 * Список операций, которым нужен ключ машины (`Authorization: Device`), а не сессия человека.
 * Источник — резолверы бэкенда, зовущие `require_device`. Пересобрать:
 *
 *   cd backend && .venv/bin/python -m apps.devices.device_operations
 *
 * 🔴 Почему сгенерировано, а не написано: 16.08 `apolloClient` выбирал заголовок по наличию
 * токена. Пока сессии в приложении не бывало, это совпадало с истиной; связывание выдало
 * сессию — и мастер встал на переходе 1→2. Рукописный список разошёлся бы с кодом на первой
 * новой мутации, и разошёлся бы так же молча.
 */
export const DEVICE_OPERATIONS: ReadonlySet<string> = new Set([
  'advanceDeviceSetup',
  'completeDeviceSetup',
  'configureCabinetBackup',
  'exportCabinet',
  'hostHeartbeat',
  'recordCabinetBackup',
  'reportUplink',
  'thisDevice',
]);
