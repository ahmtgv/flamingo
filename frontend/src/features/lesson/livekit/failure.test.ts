import { describe, expect, it } from 'vitest';

import { CONNECT_DEADLINE_MS, classifyFailure } from './useLiveKitRoom';

/**
 * 🔴 МОЛЧАЩИЙ ЧЁРНЫЙ ПРЯМОУГОЛЬНИК — ХУДШЕЕ ИЗ ВОЗМОЖНОГО (наряд 35 §1.4).
 *
 * Замер 18.08: порвал сокет до медиасервера и посмотрел, что видит преподаватель. Экран
 * оказался **неотличим от исправного** — «Ваша камера в эфире», ни слова о том, что эфир не
 * поднялся. Он ведёт урок, уверенный, что класс его видит.
 *
 * Две причины, обе закрыты:
 *   1. подпись говорила про КАМЕРУ, а не про ЭФИР — теперь про эфир;
 *   2. `room.connect()` перебирает попытки сам и отклоняется поздно, а к тому моменту эффект
 *      успевает пересобраться и отказ проглатывается — состояние навсегда `connecting`.
 *      Срок кладёт этому предел со стороны продукта.
 */
describe('отказ эфира назван словами', () => {
  it('сервер не отвечает — это отдельная причина, а не «что-то пошло не так»', () => {
    expect(classifyFailure('ConnectionError: could not establish signal connection')).toBe(
      'unreachable',
    );
    expect(classifyFailure('signal connection timed out')).toBe('unreachable');
    expect(classifyFailure('WebSocket closed')).toBe('unreachable');
  });

  it('не пустили — тоже отдельная: лечится другим действием', () => {
    expect(classifyFailure('permission denied')).toBe('rejected');
    expect(classifyFailure('invalid token')).toBe('rejected');
  });

  it('неизвестное остаётся неизвестным — не выдаём догадку за факт', () => {
    expect(classifyFailure('что-то новое')).toBe('unknown');
    expect(classifyFailure(null)).toBe('unknown');
  });

  it('срок ожидания дольше собственных попыток livekit и короче терпения человека', () => {
    // Меньше — оборвём живое переподключение; больше — человек перед классом уже решил,
    // что сломалось, и ушёл в Zoom.
    expect(CONNECT_DEADLINE_MS).toBeGreaterThanOrEqual(15_000);
    expect(CONNECT_DEADLINE_MS).toBeLessThanOrEqual(30_000);
  });
});
