import { describe, expect, it } from 'vitest';

import { LOST_AFTER, RECOVERY_MS, SLOW_MS, connectionWord, settle } from './connection';

const ok = (ms = 100) => ({ reached: true, ms });
const lost = { reached: false, ms: 0 };

describe('слово о связи', () => {
  it('браузер сказал «сети нет» — верим сразу', () => {
    expect(connectionWord({ browserOnline: false, recent: [ok(), ok()] })).toBe('none');
  });

  it('браузер сказал «сеть есть», а запросы не доходят — всё равно «нет»', () => {
    // Школьный вайфай отвечает `онлайн`, пока не доходит никуда. Верить ему нельзя.
    expect(connectionWord({ browserOnline: true, recent: [ok(), lost, lost] })).toBe('none');
  });

  it('ничего ещё не измерено — так и говорим, а не «хорошо»', () => {
    expect(connectionWord({ browserOnline: true, recent: [] })).toBe('unmeasured');
  });

  it('ОДИН не дошедший запрос связь не роняет', () => {
    // 🔴 Это и есть запрет владельца на мигающую плашку: один сбой бывает у всех.
    expect(LOST_AFTER).toBeGreaterThan(1);
    expect(connectionWord({ browserOnline: true, recent: [ok(), ok(), lost] })).toBe('good');
  });

  it('один медленный ответ канал не портит, а половина — портит', () => {
    expect(connectionWord({ browserOnline: true, recent: [ok(), ok(), ok(SLOW_MS)] })).toBe('good');
    expect(
      connectionWord({ browserOnline: true, recent: [ok(SLOW_MS), ok(SLOW_MS), ok()] }),
    ).toBe('weak');
  });
});

describe('гистерезис: сообщение, а не мигание', () => {
  it('ухудшение показываем немедленно', () => {
    const was = { word: 'good' as const, since: 1_000 };
    expect(settle(was, 'none', 1_100)).toEqual({ word: 'none', since: 1_100 });
  });

  it('улучшение придерживаем — иначе плашка мигает', () => {
    const was = { word: 'none' as const, since: 1_000 };
    expect(settle(was, 'good', 1_000 + RECOVERY_MS - 1)).toBe(was);
    expect(settle(was, 'good', 1_000 + RECOVERY_MS)).toEqual({
      word: 'good',
      since: 1_000 + RECOVERY_MS,
    });
  });

  it('дребезг связи не даёт мигания: за секунду ни одного возврата в «хорошо»', () => {
    // Канал дёргается туда-сюда десять раз за секунду — так ведёт себя слабый вайфай.
    let state = { word: 'none' as const, since: 0 } as { word: 'none' | 'good'; since: number };
    const words: string[] = [];
    for (let i = 1; i <= 10; i += 1) {
      state = settle(state, i % 2 === 0 ? 'good' : 'none', i * 100) as typeof state;
      words.push(state.word);
    }
    expect(words.every((w) => w === 'none')).toBe(true);
  });
});
