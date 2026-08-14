import { describe, expect, it } from 'vitest';

import { DEFAULT_MEETING_MODE, joinUrl, MEETING_MODES, whenOpened } from './invite';

describe('дверь группы (лист D3)', () => {
  it('🔴 по умолчанию — только ученики этой группы', () => {
    // Решение владельца 14.08, п.1: посторонний со ссылкой не войдёт, свои заходят без стука.
    expect(DEFAULT_MEETING_MODE).toBe('GROUP_ONLY');
  });

  it('три режима, и обычный школьный — первый', () => {
    expect(MEETING_MODES).toEqual(['GROUP_ONLY', 'ANY_AUTHENTICATED', 'KNOCK']);
  });

  it('адрес двери собирается в одном месте', () => {
    // Три сборки одной строки — три способа разойтись, и разойдутся они на ученике.
    expect(joinUrl('english-a2-чт18', 'https://flamingo.plus')).toBe(
      'https://flamingo.plus/к/english-a2-чт18',
    );
  });

  it('у каждого режима есть слова и пояснение', async () => {
    const ru = (await import('@/i18n/locales/ru/meeting.json')).default as {
      invite: { modes: Record<string, string> };
    };
    for (const mode of MEETING_MODES) {
      expect(ru.invite.modes[mode], mode).toBeTruthy();
      expect(ru.invite.modes[`${mode}_HINT`], `${mode}_HINT`).toBeTruthy();
    }
  });

  it('вчерашний заход не выглядит как «только что»', () => {
    // «21:28» у того, кто заходил три дня назад, читается как «стоит за дверью прямо сейчас».
    const now = new Date('2026-08-14T21:30:00');
    expect(whenOpened('2026-08-14T21:24:00', now)).toBe('21:24');
    expect(whenOpened('2026-08-11T21:28:00', now)).toMatch(/августа/);
  });

  it('ученик знает, где лежит его черновик', async () => {
    // Очередь остаётся в браузере (решение владельца) — значит это должно быть сказано.
    const ru = (await import('@/i18n/locales/ru/meeting.json')).default as {
      available: { homeworkDraft: string };
    };
    expect(ru.available.homeworkDraft).toMatch(/устройств/i);
  });
});
