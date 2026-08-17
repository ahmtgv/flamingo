import { execFileSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * 🔴 ТЕСТОВЫЙ КОНТУР — СВОЙ СЕРВЕР И СВОЯ БАЗА (промпт 29 §2).
 *
 * Сквозной прогон ходил по БОЕВОМУ серверу и заводил там учётку на каждом проходе. Живых
 * людей в базе пока нет, поэтому это не авария; но ночной прогон, пишущий в боевую базу, до
 * первого настоящего ученика доживать не должен.
 *
 * ⚠️ БОЕВАЯ ПРОВЕРКА НЕ ВЫКЛЮЧЕНА, и это не осторожность, а находка. Три дефекта августа
 * существовали ТОЛЬКО на боевом и на localhost не воспроизводились — прежде всего CORS,
 * который 15.08 молча гасил весь мастер (ответ 200 и без заголовка). Поэтому:
 *
 *   * `FLAMINGO_API` без значения по умолчанию остаётся БОЕВЫМ — ручная проверка работает
 *     ровно так, как работала, и ничего не сломано;
 *   * `npm run e2e` поднимает этот контур и указывает прогон на него;
 *   * один сценарий (`site.spec.ts` → боевой origin) продолжает спрашивать боевой сервер.
 *
 * Контур поднимается на своём порту и своей базе, накатывает миграции и убирает за собой.
 */

const REPO = join(process.cwd(), '..');
const BACKEND = join(REPO, 'backend');
const PYTHON = join(BACKEND, '.venv/bin/python');

/** Свой порт и своя база — ни одна цифра не совпадает с рабочими (8000 / flamingo). */
export const CIRCUIT_PORT = 8011;
export const CIRCUIT_DB = 'flamingo_e2e';
export const CIRCUIT_API = `http://127.0.0.1:${CIRCUIT_PORT}/graphql/`;

function env(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    // ⚠️ Локаль обязательна: без неё postgres на этой машине падает с
    // «postmaster became multithreaded» — час поисков в июне.
    LC_ALL: 'en_US.UTF-8',
    LANG: 'en_US.UTF-8',
    POSTGRES_HOST: 'localhost',
    POSTGRES_USER: 'flamingo',
    POSTGRES_PASSWORD: 'flamingo',
    POSTGRES_DB: CIRCUIT_DB,
    PYTHONPATH: BACKEND,
    DJANGO_SETTINGS_MODULE: 'config.settings',
  };
}

/** Есть ли вообще из чего поднимать контур на этой машине. */
export function circuitAvailable(): boolean {
  return existsSync(PYTHON);
}

function psql(sql: string): void {
  execFileSync('/opt/homebrew/opt/postgresql@16/bin/psql', ['-U', 'flamingo', '-d', 'postgres', '-c', sql], {
    env: env(),
    stdio: 'ignore',
  });
}

/**
 * Поднять контур: своя база, миграции, сервер. Возвращает функцию остановки.
 *
 * База пересоздаётся начисто каждый раз — прогон не должен зависеть от того, что осталось от
 * прошлого. Это и есть «сносит за собой»: следующий запуск начинает с пустого места.
 */
export async function startCircuit(): Promise<() => void> {
  psql(`DROP DATABASE IF EXISTS ${CIRCUIT_DB}`);
  psql(`CREATE DATABASE ${CIRCUIT_DB} OWNER flamingo`);
  execFileSync(PYTHON, ['manage.py', 'migrate', '--noinput'], {
    cwd: BACKEND,
    env: env(),
    stdio: 'ignore',
  });

  const server = spawn(
    join(BACKEND, '.venv/bin/uvicorn'),
    ['config.asgi:application', '--port', String(CIRCUIT_PORT), '--host', '127.0.0.1'],
    { cwd: BACKEND, env: env(), stdio: 'ignore' },
  );

  // Ждём, пока схема соберётся и порт ответит: Strawberry строит её при импорте, и это
  // занимает секунды. Стучимся, а не спим наугад.
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(CIRCUIT_API, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: '{ __typename }' }),
      });
      if (res.ok) break;
    } catch {
      // ещё не поднялся
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  return () => {
    server.kill();
    try {
      psql(`DROP DATABASE IF EXISTS ${CIRCUIT_DB}`);
    } catch {
      // База могла остаться занятой — не повод ронять прогон.
    }
  };
}
