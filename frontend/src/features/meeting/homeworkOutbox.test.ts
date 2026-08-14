import { beforeEach, describe, expect, it, vi } from 'vitest';

import { flush, pending, pendingFor, queueSubmission } from './homeworkOutbox';

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
  store.clear();
  vi.stubGlobal('localStorage', fakeStorage);
});

describe('домашняя работа при выключенном хосте (лист D3)', () => {
  it('пишется сейчас и ждёт', () => {
    // «Можно писать сейчас — ответ уйдёт сам, когда преподаватель появится в сети.»
    queueSubmission('hw-1', 'Иду прямо, потом направо');
    expect(pendingFor('hw-1')?.text).toBe('Иду прямо, потом направо');
    expect(pendingFor('hw-1')?.writtenAt).toBeTruthy();
  });

  it('одна работа — одна запись: правка заменяет черновик', () => {
    queueSubmission('hw-1', 'первый вариант');
    queueSubmission('hw-1', 'второй вариант');
    expect(pending()).toHaveLength(1);
    expect(pendingFor('hw-1')?.text).toBe('второй вариант');
  });

  it('уходит само, когда хост появился', async () => {
    queueSubmission('hw-1', 'готово');
    queueSubmission('hw-2', 'и это тоже');

    const sent = await flush(async () => true);

    expect(sent).toHaveLength(2);
    expect(pending()).toHaveLength(0);
  });

  it('🔴 не принятое сервером остаётся в очереди', async () => {
    // Сочинение, написанное вечером, не должно исчезнуть потому, что сеть моргнула на
    // середине списка — это ровно та потеря, ради предотвращения которой очередь и есть.
    queueSubmission('hw-1', 'уедет');
    queueSubmission('hw-2', 'останется');

    const sent = await flush(async (row) => row.homeworkId === 'hw-1');

    expect(sent.map((r) => r.homeworkId)).toEqual(['hw-1']);
    expect(pending().map((r) => r.homeworkId)).toEqual(['hw-2']);
  });

  it('брошенное исключение — тоже не повод потерять работу', async () => {
    queueSubmission('hw-1', 'важное');
    await flush(async () => {
      throw new Error('сеть');
    });
    expect(pendingFor('hw-1')?.text).toBe('важное');
  });
});
