import { useTranslation } from 'react-i18next';

import type { CourseFormat, CourseLevel } from '@/entities/graphql/generated';
import { SelectField } from '@/shared/ui';

import { FORMATS, GRADES, STAGES, type Stage, levelForStage, stageOf } from '../audience';

/**
 * Аудитория курса — два поля вместо одного длинного списка (решение владельца 15.08).
 * Обоснование деления и разбор случаев — в `../audience.ts`.
 *
 * Один компонент на обе формы, создание и правку: разойдись они, курс завёлся бы с одной
 * аудиторией, а правился по другой.
 */
export function AudienceFields({
  level,
  format,
  onLevel,
  onFormat,
}: {
  level: CourseLevel;
  format: CourseFormat;
  onLevel: (next: CourseLevel) => void;
  onFormat: (next: CourseFormat) => void;
}) {
  const { t } = useTranslation('courses');
  const stage = stageOf(level);

  return (
    <>
      <SelectField
        label={t('stage.label')}
        hint={t('stage.hint')}
        value={stage}
        onChange={(e) => onLevel(levelForStage(e.target.value as Stage, level))}
      >
        {STAGES.map((s) => (
          <option key={s} value={s}>
            {t(`stage.${s}`)}
          </option>
        ))}
      </SelectField>

      {/* Класс — второй вопрос, и только для школы. Одиннадцать пунктов показываются тому,
          кто уже сказал «школа», а не всем подряд вперемешку с вузом и дошкольниками. */}
      {stage === 'SCHOOL' && (
        <SelectField
          label={t('stage.gradeLabel')}
          value={level}
          onChange={(e) => onLevel(e.target.value as CourseLevel)}
        >
          {GRADES.map((g) => (
            <option key={g} value={g}>
              {t(`level.${g}`)}
            </option>
          ))}
        </SelectField>
      )}

      <SelectField
        label={t('formatField.label')}
        hint={t('formatField.hint')}
        value={format}
        onChange={(e) => onFormat(e.target.value as CourseFormat)}
      >
        {FORMATS.map((f) => (
          <option key={f} value={f}>
            {t(`format.${f}`)}
          </option>
        ))}
      </SelectField>
    </>
  );
}
