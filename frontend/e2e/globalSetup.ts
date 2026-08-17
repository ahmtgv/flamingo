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
   * 🔴 ПРИЧИНА, ПО КОТОРОЙ ПЯТНАДЦАТЫЙ НЕ ШЁЛ, НАЙДЕНА (промпт 30 §2.2).
   *
   * Адрес API **вшит в сборку** (`.env.desktop`): внутри приложения страница отдаётся
   * протоколом `tauri://localhost`, и относительный `/graphql/` указывал бы в само
   * приложение. Перехватчик же слушал `FLAMINGO_API`. Стоило увести прогон на контур — и
   * адреса разошлись: приложение звало боевой, перехватчик сторожил контур, запрос кода
   * связывания уходил мимо. Теперь перехватчик слушает вшитый адрес, а выполняет по `api`.
   *
   * Контур снова по умолчанию. Отключить и пойти на боевой — переменной:
   *
   *     FLAMINGO_API=https://api.flamingo.plus/graphql/ npm run e2e
   */
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
