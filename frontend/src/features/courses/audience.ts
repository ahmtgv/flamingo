import type { CourseFormat, CourseLevel } from '@/entities/graphql/generated';

/**
 * Аудитория курса — ДВЕ независимые оси (решение владельца 15.08).
 *
 * Список «1–11 класс · Взрослые» был узок, и расширять его теми пятью пунктами, что назвал
 * владелец, нельзя одним списком: «дошкольники · колледжи · вузы» — это МЕСТО человека в
 * системе образования, а «курсы · повышение квалификации» — ВИД программы. Одна ось их не
 * держит: «курс английского для 7 класса» требует обеих сразу, и в едином списке пришлось бы
 * заводить пункт на каждую пару — те самые двадцать штук, которые владелец и запретил.
 *
 * Деление не выдумано под задачу: ФЗ-273 ст. 10 перечисляет дошкольное · общее · среднее
 * профессиональное · высшее как УРОВНИ, а ст. 75–76 ставит дополнительное и дополнительное
 * профессиональное рядом отдельной ветвью. Это ровно две наши оси.
 *
 * Как список остаётся коротким: ступень спрашивается в два шага. Сначала пять пунктов
 * (дошкольники · школа · колледж · вуз · взрослые); класс — второй вопрос, и только если
 * выбрана школа. В любом состоянии формы видно не больше одиннадцати вариантов.
 */

export const STAGES = ['PRESCHOOL', 'SCHOOL', 'COLLEGE', 'UNIVERSITY', 'ADULT'] as const;
export type Stage = (typeof STAGES)[number];

export const GRADES: CourseLevel[] = [
  'GRADE_1', 'GRADE_2', 'GRADE_3', 'GRADE_4', 'GRADE_5', 'GRADE_6',
  'GRADE_7', 'GRADE_8', 'GRADE_9', 'GRADE_10', 'GRADE_11',
];

export const FORMATS: CourseFormat[] = ['PROGRAM', 'COURSE', 'PROFESSIONAL'];

/** Ступень по сохранённому уровню — форма редактирования открывается там, где её закрыли. */
export function stageOf(level: CourseLevel): Stage {
  if (level === 'PRESCHOOL') return 'PRESCHOOL';
  if (level === 'COLLEGE') return 'COLLEGE';
  if (level === 'UNIVERSITY') return 'UNIVERSITY';
  if (level === 'ADULT') return 'ADULT';
  return 'SCHOOL';
}

/**
 * Уровень по выбранной ступени. Для школы держим ранее выбранный класс, если он школьный, —
 * иначе человек, заглянувший в «Взрослые» и вернувшийся, терял свой 7 класс.
 */
export function levelForStage(stage: Stage, previous: CourseLevel): CourseLevel {
  if (stage === 'SCHOOL') return GRADES.includes(previous) ? previous : 'GRADE_7';
  return stage as CourseLevel;
}
