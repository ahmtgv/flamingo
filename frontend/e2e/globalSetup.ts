import { circuitAvailable, CIRCUIT_API, startCircuit } from './testCircuit';

/**
 * Поднять тестовый контур перед прогоном — если человек не сказал иначе.
 *
 * `FLAMINGO_API` задан руками → уважаем и не поднимаем ничего: так проверяют боевой.
 * Не задан → поднимаем свой и указываем прогон на него, чтобы ночной запуск не писал
 * в боевую базу (промпт 29 §2).
 */
let stop: (() => void) | null = null;

export default async function globalSetup() {
  /**
   * ⚠️ КОНТУР ПОКА ПО ЗАПРОСУ, А НЕ ПО УМОЛЧАНИЮ — и это откат, а не задумка.
   *
   * Контур поднимается, база своя, 14 сценариев из 15 идут по нему и боевую базу не трогают.
   * Пятнадцатый — мастер первого запуска — на контуре не доходит до кода связывания:
   * `requestPairingCode` до контура не долетает, кодов в его базе ноль. Причина не найдена.
   *
   * Закон фазы: «число упало — остановиться и разобраться», и «правка, задевшая работающее,
   * ОТКАТЫВАЕТСЯ, а не дочинивается на ходу». Прогон по умолчанию обязан оставаться 15/15,
   * поэтому контур включается переменной, пока пятнадцатый не поедет:
   *
   *     FLAMINGO_E2E_CIRCUIT=1 npm run e2e
   */
  if (!process.env.FLAMINGO_E2E_CIRCUIT) return;
  if (process.env.FLAMINGO_API) {
    console.log(`[e2e] FLAMINGO_API задан вручную: ${process.env.FLAMINGO_API}`);
    return;
  }
  if (!circuitAvailable()) {
    // Честно говорим, а не притворяемся, что подняли: иначе прогон молча уйдёт на боевой.
    console.warn('[e2e] тестовый контур недоступен (нет backend/.venv) — прогон пойдёт на боевой');
    return;
  }
  stop = await startCircuit();
  process.env.FLAMINGO_API = CIRCUIT_API;
  // ⚠️ И ФРОНТ ТУДА ЖЕ. Прогон ходит через `vite preview`, а тот проксирует `/graphql` по
  // `VITE_PROXY_TARGET`. Без этой строки половина сценария шла на контур, половина — на
  // рабочий сервер: код связывания заводился на одном, искался на другом.
  process.env.VITE_PROXY_TARGET = CIRCUIT_API.replace('/graphql/', '');
  console.log(`[e2e] тестовый контур поднят: ${CIRCUIT_API}`);
}

export function stopCircuit() {
  stop?.();
  stop = null;
}
