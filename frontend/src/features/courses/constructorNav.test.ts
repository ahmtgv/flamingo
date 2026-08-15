import { describe, expect, it } from 'vitest';

import { focusSectionId, matches } from './constructorNav';

/**
 * Навигация конструктора — находка владельца 15.08, п.2: «как не потеряться в двадцати уроках».
 *
 * Проверяются две чистые функции, на которых держится ответ: какой раздел открыт при входе и
 * что показывает фильтр. Раскладку они не считают, поэтому проверяются числами, а не глазом.
 */
describe('фильтр уроков', () => {
  const published = { status: 'PUBLISHED', nextSessionAt: null };
  const draft = { status: 'DRAFT', nextSessionAt: null };
  const scheduledDraft = { status: 'DRAFT', nextSessionAt: '2026-08-20T09:00:00Z' };

  it('«все» пропускает всё — фильтр по умолчанию ничего не прячет', () => {
    for (const lesson of [published, draft, scheduledDraft]) {
      expect(matches(lesson, 'all')).toBe(true);
    }
  });

  it('«опубликованные» и «черновики» делят список ровно надвое', () => {
    expect(matches(published, 'published')).toBe(true);
    expect(matches(draft, 'published')).toBe(false);
    expect(matches(draft, 'draft')).toBe(true);
    expect(matches(published, 'draft')).toBe(false);
  });

  it('«с занятием» — про назначенное занятие, а не про публикацию', () => {
    // Черновик с назначенным занятием существует и это не ошибка: урок готовят к дате.
    expect(matches(scheduledDraft, 'scheduled')).toBe(true);
    expect(matches(published, 'scheduled')).toBe(false);
  });
});

describe('какой раздел открыт при входе', () => {
  it('тот, где ближайшее занятие, — а не первый', () => {
    const course = {
      sections: [
        { id: 's1', lessons: [{ nextSessionAt: null }] },
        { id: 's2', lessons: [{ nextSessionAt: '2026-09-10T09:00:00Z' }] },
        { id: 's3', lessons: [{ nextSessionAt: '2026-08-20T09:00:00Z' }] },
      ],
    };
    // 🔴 Открывать первый раздел почти всегда неверно: работа идёт в середине курса, а раздел
    // «Введение» пройден в сентябре.
    expect(focusSectionId(course)).toBe('s3');
  });

  it('занятий не назначено — открывается первый: курс ещё собирают', () => {
    const course = {
      sections: [
        { id: 's1', lessons: [{ nextSessionAt: null }] },
        { id: 's2', lessons: [] },
      ],
    };
    expect(focusSectionId(course)).toBe('s1');
  });

  it('разделов нет вовсе — открывать нечего, и это не падение', () => {
    expect(focusSectionId({ sections: [] })).toBeNull();
  });
});
