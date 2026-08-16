/**
 * Живой API боевого сервера — та половина сценария, которую в приложении делает браузер.
 *
 * 🔴 Прогон идёт по БОЕВОМУ контуру намеренно (промпт 24 §6): три дефекта из найденных
 * существовали только там и на localhost не воспроизводились. Тестового контура у нас нет —
 * это отдельная задача, названная в отчёте.
 *
 * 🔒 Учётки заводятся с почтой `@flamingo-test.invalid` — зона RFC 2606, настоящей почты
 * в ней не бывает. По этой же маске их убирает `manage.py purge_test_accounts`.
 */

const API = process.env.FLAMINGO_API ?? 'https://api.flamingo.plus/graphql/';

async function withRetries(run: () => Promise<Response>, attempts = 4): Promise<Response> {
  let last: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await run();
    } catch (error) {
      last = error;
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  throw last;
}

async function gql<T>(query: string, variables: Record<string, unknown>, auth?: string): Promise<T> {
  // ⚠️ Те же повторы, что в прокси: сеть до боевого сервера отсюда нестабильна, а ложный
  // красный в сквозном прогоне стоит дороже лишней секунды ожидания.
  const res = await withRetries(() => fetch(API, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      // Прогон представляется приложением: предполётный запрос из-под этого адреса —
      // ровно то, что однажды молча гасило весь мастер.
      origin: 'tauri://localhost',
      ...(auth ? { authorization: auth } : {}),
    },
    body: JSON.stringify({ query, variables }),
  }));
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(`API: ${json.errors[0].message}`);
  if (!json.data) throw new Error('API: пустой ответ');
  return json.data;
}

export interface TestTeacher {
  email: string;
  token: string;
}

export async function registerTestTeacher(): Promise<TestTeacher> {
  const email = `test-teacher-${Date.now()}@flamingo-test.invalid`;
  const data = await gql<{ registerUser: { token: string } }>(
    'mutation($i: RegisterUserInput!){ registerUser(input:$i){ token } }',
    {
      i: {
        email,
        password: 'T3stPass!2026',
        firstName: 'Ирина',
        lastName: 'Петровна',
        role: 'TEACHER',
        consent152fz: true,
      },
    },
  );
  return { email, token: data.registerUser.token };
}

export async function confirmPairingCode(token: string, code: string): Promise<string> {
  const data = await gql<{ confirmPairingCode: { id: string; name: string } }>(
    'mutation($c:String!){ confirmPairingCode(code:$c){ id name } }',
    { c: code },
    `Bearer ${token}`,
  );
  return data.confirmPairingCode.id;
}
