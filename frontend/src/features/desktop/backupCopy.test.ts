import { beforeEach, describe, expect, it, vi } from 'vitest';

import { backupDestination, copyBackupOut, lastCopyOut, rememberCopyOut } from './backupCopy';

const invoke = vi.fn();

function insideTheApp() {
  (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = { invoke };
}

/**
 * jsdom в этой сборке не даёт `localStorage` вовсе — поэтому модуль его и охраняет
 * (`typeof localStorage === 'undefined'`). Заглушка проверяет НАШУ логику, а не чужое
 * хранилище; в приложении преподавателя настоящее localStorage есть.
 */
const store = new Map<string, string>();
const fakeStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: (i: number) => [...store.keys()][i] ?? null,
  get length() {
    return store.size;
  },
} satisfies Storage;

beforeEach(() => {
  invoke.mockReset();
  store.clear();
  vi.stubGlobal('localStorage', fakeStorage);
  delete (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
});

describe('🔴 копия обязана покинуть машину (Р5.5-Б)', () => {
  it('уехавшая копия возвращает место, куда легла', async () => {
    insideTheApp();
    invoke.mockResolvedValue('/Volumes/Backup/cabinet-1.flamingo');

    const result = await copyBackupOut('cabinet-1.flamingo');

    expect(result).toEqual({ ok: true, at: '/Volumes/Backup/cabinet-1.flamingo' });
    // Имя, а не путь: где лежит папка кабинета — знание оболочки.
    expect(invoke).toHaveBeenCalledWith('move_backup_out', { fileName: 'cabinet-1.flamingo' });
  });

  it('🔴 отключённый диск — отдельная причина, а не «не получилось»', async () => {
    // Ради неё тут вообще есть тип ошибки: молча записать в старую папку значит сделать вид,
    // что копия есть, ровно в тот момент, когда её нет.
    insideTheApp();
    invoke.mockRejectedValue(new Error('destination-missing'));

    expect(await copyBackupOut('c.flamingo')).toEqual({
      ok: false,
      reason: 'destination-missing',
    });
  });

  it('место не выбрано — тоже своя причина', async () => {
    insideTheApp();
    invoke.mockRejectedValue(new Error('no-destination'));
    expect(await copyBackupOut('c.flamingo')).toEqual({ ok: false, reason: 'no-destination' });
  });

  it('в браузере переносить нечего и никуда', async () => {
    expect(await copyBackupOut('c.flamingo')).toEqual({ ok: false, reason: 'unavailable' });
    expect(await backupDestination()).toBe('');
    expect(invoke).not.toHaveBeenCalled();
  });

  it('каждая причина имеет свои слова в ru.json', async () => {
    const ru = (await import('@/i18n/locales/ru/desktop.json')).default as {
      settings: { data: { outFailed: Record<string, string> } };
    };
    for (const reason of ['unavailable', 'no-destination', 'destination-missing', 'failed']) {
      expect(ru.settings.data.outFailed[reason], reason).toBeTruthy();
    }
  });
});

describe('«последняя копия» — только удавшаяся', () => {
  it('запоминается место и время', () => {
    expect(lastCopyOut()).toBeNull();
    rememberCopyOut('/Volumes/Backup/cabinet-1.flamingo');
    expect(lastCopyOut()?.where).toBe('/Volumes/Backup/cabinet-1.flamingo');
    expect(lastCopyOut()?.at).toBeTruthy();
  });

  it('неудавшийся перенос ничего не отмечает', async () => {
    // Копия, которая снялась, но никуда не уехала, — не копия. Показать её датой как
    // «последняя копия» было бы неправдой в единственном месте, где это проверяют.
    insideTheApp();
    invoke.mockRejectedValue(new Error('destination-missing'));
    await copyBackupOut('c.flamingo');
    expect(lastCopyOut()).toBeNull();
  });
});
