import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEVICE_OPERATIONS } from './deviceOperations.generated';
import { credentialFor } from './credential';
import { clearSession, setSession } from './session';

/**
 * 🔴 КТО ПРЕДЪЯВЛЯЕТСЯ СЕРВЕРУ. Дважды подряд ошиблись здесь, и оба раза встал весь мастер.
 *
 * · 15.08 — уходил только `Bearer`, шагам 2–5 нужен `Device`. Кнопки нажимались молча.
 * · 16.08 — выбор «по наличию токена». Пока сессии в приложении не бывало НИКОГДА, он
 *   случайно совпадал с истиной. §Б0-септ научил связывание выдавать сессию — и все восемь
 *   `require_device`-операций пошли как `Bearer`. Мастер встал на переходе 1→2.
 *
 * ⚠️ Второй случай — ровно «правка открыла тропинку, по которой код раньше не ходил».
 * Поэтому главный тест здесь — **с сессией**, то есть в состоянии, которого раньше не бывало.
 */

vi.mock('@/features/desktop/machineKey', () => ({
  machineKeyInMemory: () => mockKey,
}));

let mockKey: string | null = null;

afterEach(() => {
  mockKey = null;
  clearSession();
});

describe('🔴 машина и человек — с сессией, то есть в состоянии после связывания', () => {
  it('операция машины идёт ключом машины, ХОТЯ сессия есть', () => {
    // Тот самый дефект 16.08. Без этой строки мастер не переходит с шага 1 на шаг 2.
    mockKey = 'ключ-машины';
    setSession('токен-преподавателя', 'refresh');

    expect(credentialFor('advanceDeviceSetup')).toEqual({
      authorization: 'Device ключ-машины',
    });
  });

  it.each([...DEVICE_OPERATIONS])('%s ходит ключом машины при живой сессии', (operation) => {
    // Все восемь разом: дефект был не в одной мутации, а в правиле выбора.
    mockKey = 'ключ-машины';
    setSession('токен-преподавателя', 'refresh');

    expect(credentialFor(operation)).toEqual({ authorization: 'Device ключ-машины' });
  });

  it('обычная операция при той же сессии идёт от человека', () => {
    // Обратная сторона: кабинет, расписание и материалы читаются сессией, а не ключом.
    mockKey = 'ключ-машины';
    setSession('токен-преподавателя', 'refresh');

    expect(credentialFor('Me')).toEqual({ authorization: 'Bearer токен-преподавателя' });
  });
});

describe('машина без сессии — состояние мастера до связывания', () => {
  it('операция машины идёт ключом машины', () => {
    mockKey = 'ключ-машины';

    expect(credentialFor('thisDevice')).toEqual({ authorization: 'Device ключ-машины' });
  });

  it('обычная операция тоже идёт ключом — предъявить больше нечего', () => {
    mockKey = 'ключ-машины';

    expect(credentialFor('Me')).toEqual({ authorization: 'Device ключ-машины' });
  });
});

describe('браузер — ключа машины нет вовсе', () => {
  it('всё идёт сессией', () => {
    setSession('токен', 'refresh');

    expect(credentialFor('Me')).toEqual({ authorization: 'Bearer токен' });
  });

  it('операция машины без ключа не идёт НИЧЕМ, а не сессией', () => {
    // Подменять `Device` на `Bearer` нельзя: сервер разрешает их в разные вещи — в машину и
    // в человека. Пустой заголовок даст честный отказ, подменённый — тихую неправду.
    setSession('токен', 'refresh');

    expect(credentialFor('advanceDeviceSetup')).toBeNull();
  });

  it('без всего — ничего', () => {
    expect(credentialFor('Me')).toBeNull();
  });
});

describe('список операций машины', () => {
  it('не пуст и содержит шаги мастера', () => {
    // Страховка от зелени на пустом множестве: если генератор однажды отдаст пустой список,
    // проверки выше пройдут идеально и не будут значить ничего.
    expect(DEVICE_OPERATIONS.size).toBeGreaterThanOrEqual(7);
    for (const op of ['thisDevice', 'advanceDeviceSetup', 'completeDeviceSetup']) {
      expect(DEVICE_OPERATIONS.has(op)).toBe(true);
    }
  });

  it('обычных операций в нём нет', () => {
    for (const op of ['Me', 'Login', 'Schedule', 'CourseDetail']) {
      expect(DEVICE_OPERATIONS.has(op)).toBe(false);
    }
  });
});

// 🔴 Найдено владельцем 16.08, третий заход подряд: мастер вставал на переходе 1→2, хотя
// выбор «по операции» уже был сделан. Список сгенерирован из резолверов, где операции зовутся
// именами ПОЛЕЙ (`configureCabinetBackup`), а Apollo подставляет имя ДОКУМЕНТА
// (`ConfigureCabinetBackup`). Совпадений не было ни одного.
//
// Тест выше перебирает сам список и потому проходит всегда — он проверяет себя. Здесь имена
// взяты из документов `.graphql`, то есть ровно те, с которыми приходит Apollo.
describe('имя документа, а не поля схемы', () => {
  const FROM_DOCUMENTS = [
    'ConfigureCabinetBackup',
    'AdvanceDeviceSetup',
    'CompleteDeviceSetup',
    'RecordCabinetBackup',
    'ReportUplink',
    'ExportCabinet',
    'ThisDevice',
  ];

  it.each(FROM_DOCUMENTS)('%s ходит ключом машины, а не сессией', (name) => {
    mockKey = 'ключ-машины';
    setSession('токен-преподавателя', 'refresh');

    expect(credentialFor(name)).toEqual({ authorization: 'Device ключ-машины' });
  });
});
