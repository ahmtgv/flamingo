import { machineKeyInMemory } from '@/features/desktop/machineKey';

import { DEVICE_OPERATIONS } from './deviceOperations.generated';
import { getAccessToken } from './session';

/**
 * Чем представляется этот запрос: сессией человека или ключом машины.
 *
 * 🔴 Вынесено из `apolloClient` отдельной функцией (промпт 21 §2.2), потому что решение
 * оказалось нетривиальным ДВАЖДЫ подряд, и оба раза ломало мастер целиком:
 *
 * · 15.08 — уходил только `Bearer`, а шагам 2–5 нужен был `Device`. Мастер стоял.
 * · 16.08 — выбор «по наличию токена» стал неверным, как только связывание начало выдавать
 *   сессию: все `require_device`-операции пошли как `Bearer`. Мастер встал на переходе 1→2.
 *
 * Внутри `setContext` это решение проверялось только запуском всего приложения. Здесь его
 * можно прижать тестом за миллисекунду — и тест ловит именно ту ошибку, которая случилась.
 */
export type Credential = { authorization: string } | null;

export function credentialFor(operationName: string | undefined): Credential {
  const machineKey = machineKeyInMemory();

  // Правило 1: операция машины ходит ключом машины — даже когда сессия человека есть.
  // Список сгенерирован из резолверов бэкенда, зовущих `require_device`.
  if (DEVICE_OPERATIONS.has(operationName ?? '')) {
    return machineKey ? { authorization: `Device ${machineKey}` } : null;
  }

  // Правило 2: где годятся оба — идёт человек. Иначе браузер преподавателя, открытый рядом,
  // начал бы ходить с правами машины.
  const token = getAccessToken();
  if (token) return { authorization: `Bearer ${token}` };
  if (machineKey) return { authorization: `Device ${machineKey}` };

  // Правило 3: никогда оба сразу и никогда пустой заголовок — сервер не должен гадать.
  return null;
}
