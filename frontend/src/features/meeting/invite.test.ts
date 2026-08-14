import { describe, expect, it } from 'vitest';

import {
  DEFAULT_MEETING_MODE,
  JOIN_PATH,
  JOIN_PATH_ALIAS,
  joinUrl,
  MEETING_MODES,
  whenOpened,
} from './invite';

describe('дверь группы (лист D3)', () => {
  it('🔴 по умолчанию — только ученики этой группы', () => {
    // Решение владельца 14.08, п.1: посторонний со ссылкой не войдёт, свои заходят без стука.
    expect(DEFAULT_MEETING_MODE).toBe('GROUP_ONLY');
  });

  it('три режима, и обычный школьный — первый', () => {
    expect(MEETING_MODES).toEqual(['GROUP_ONLY', 'ANY_AUTHENTICATED', 'KNOCK']);
  });

  it('людям печатается латинский путь, кириллический остаётся псевдонимом', () => {
    // В percent-encoding «/к/» превращается в «/%D0%BA/» — и именно это увидит родитель,
    // которому переслали ссылку. Нечитаемая ссылка выглядит подозрительно.
    expect(JOIN_PATH).toBe('/j');
    expect(JOIN_PATH_ALIAS).toBe('/к');
    expect(joinUrl('english-a2-cht18', 'https://flamingo.plus')).toBe(
      'https://flamingo.plus/j/english-a2-cht18',
    );
  });

  it('🔴 ссылка печатается только с канонического адреса', () => {
    // Панель могут открыть на стенде или на localhost. Скопированная оттуда ссылка уйдёт
    // классу и не откроется ни у кого — ошибиться здесь можно один раз и сразу у всех.
    expect(joinUrl('slug', 'https://flamingo.plus')).toMatch(/^https:\/\/flamingo\.plus\//);
    expect(joinUrl('slug', 'https://flamingo.plus')).not.toContain('localhost');
  });

  it('оба маршрута заведены — уже разосланные ссылки не умирают', async () => {
    // Кириллический путь снят с печати, но не с обслуживания: ссылки, которые уже у людей,
    // обязаны открываться. Проверяем сам роутер, а не намерение.
    const { readFileSync } = await import('node:fs');
    const { dirname, resolve } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const router = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), '../../app/router.tsx'),
      'utf8',
    );
    expect(router).toContain(`path="${JOIN_PATH}/:slug"`);
    expect(router).toContain(`path="${JOIN_PATH_ALIAS}/:slug"`);
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
