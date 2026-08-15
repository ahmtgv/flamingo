/**
 * Навигация конструктора курса — находка владельца 15.08, п.2: «как не потеряться в двадцати
 * уроках».
 *
 * Чистые функции живут отдельно от экрана намеренно: их проверяет тест числами, а не через
 * раскладку, и правило «какой раздел открыт при входе» становится читаемым правилом, а не
 * условием, спрятанным в середине JSX.
 */
export const LESSON_FILTERS = ['all', 'published', 'draft', 'scheduled'] as const;
export type LessonFilter = (typeof LESSON_FILTERS)[number];

/** Подходит ли урок под фильтр. Чистая функция — её проверяет тест, а не глаз. */
export function matches(
  lesson: { status: string; nextSessionAt?: string | null },
  filter: LessonFilter,
): boolean {
  if (filter === 'published') return lesson.status === 'PUBLISHED';
  if (filter === 'draft') return lesson.status === 'DRAFT';
  if (filter === 'scheduled') return !!lesson.nextSessionAt;
  return true;
}

/**
 * Какой раздел открыт при входе — тот, где ближайшее занятие.
 *
 * Открывать все — это та самая простыня, из-за которой находка и появилась. Открывать первый —
 * почти всегда не тот: работа идёт в середине курса, а не в разделе «Введение», пройденном в
 * сентябре. Раздел с ближайшим занятием — это то, к чему преподаватель готовится сегодня.
 */
export function focusSectionId(course: {
  sections: { id: string; lessons: { nextSessionAt?: string | null }[] }[];
}): string | null {
  let best: { id: string; at: string } | null = null;
  for (const section of course.sections) {
    for (const lesson of section.lessons) {
      if (lesson.nextSessionAt && (!best || lesson.nextSessionAt < best.at)) {
        best = { id: section.id, at: lesson.nextSessionAt };
      }
    }
  }
  // Занятий не назначено вовсе — открываем первый раздел: курс, скорее всего, ещё собирают.
  return best?.id ?? course.sections[0]?.id ?? null;
}

