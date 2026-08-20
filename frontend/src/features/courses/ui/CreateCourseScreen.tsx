import { ICON_SM } from '@/shared/ui/iconSizes';
import { AlertCircle } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import {
  type CourseFormat,
  type CourseLevel,
  useCreateCourseMutation,
} from '@/entities/graphql/generated';
import { Button, Logo, TextField } from '@/shared/ui';

import { AudienceFields } from './AudienceFields';
import styles from './create.module.css';
import { HOME_ROUTE } from '@/shared/lib/homeRoute';

export function CreateCourseScreen() {
  const { t } = useTranslation(['courses', 'common']);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    subject: '',
    level: 'GRADE_7' as CourseLevel,
    format: 'PROGRAM' as CourseFormat,
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [createCourse, { loading }] = useCreateCourseMutation();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = 'courses:validation.name';
    if (!form.subject.trim()) errs.subject = 'courses:validation.subject';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      const { data } = await createCourse({
        variables: {
          input: {
            title: form.title,
            subject: form.subject,
            level: form.level,
            format: form.format,
            description: form.description || null,
          },
        },
      });
      if (data?.createCourse) navigate(`/courses/${data.createCourse.id}`);
    } catch {
      setFormError(t('courses:errors.generic'));
    }
  }

  return (
    <div className={styles.shell}>
      {/*
        🔴 ЛИСТА НЕТ — СОБРАНО ИЗ ОБЩЕГО НАБОРА (наряд 43 §1). Дизайнер не рисовал экранов
        создания вовсе: «Создать курс» существует только кнопкой в кабинете. Своего вида
        здесь нет ни в одном месте — рамка, поля и кнопки из набора, собранного по листам.
      */}
      <header className={styles.top}>
        <button
          type="button"
          className={styles.logoBtn}
          onClick={() => navigate(HOME_ROUTE)}
          aria-label="Flamingo"
        >
          <Logo word={false} />
        </button>
        <button type="button" className={styles.back} onClick={() => navigate(HOME_ROUTE)}>
          {t('create.back')}
        </button>
        <span className={styles.topTitle}>{t('create.title')}</span>
        <span className={styles.step}>{t('create.step')}</span>
      </header>

      <div className={styles.page}>
        <div className={styles.head}>
          <h1 className={styles.title}>{t('create.title')}</h1>
          <p className={styles.lead}>{t('create.subtitle')}</p>
        </div>

        <form className={styles.form} noValidate onSubmit={handleSubmit}>
          {formError && (
            <p className={styles.formError} role="alert">
              <AlertCircle size={ICON_SM} aria-hidden="true" />
              {formError}
            </p>
          )}
          <TextField
            label={t('create.name')}
            requiredMark
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            error={errors.title ? t(errors.title) : undefined}
            placeholder={t('create.namePh')}
          />
          <TextField
            label={t('create.subject')}
            requiredMark
            value={form.subject}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            error={errors.subject ? t(errors.subject) : undefined}
            placeholder={t('create.subjectPh')}
          />
          {/* Аудитория — два поля (решение владельца 15.08). См. ../audience.ts. */}
          <AudienceFields
            level={form.level}
            format={form.format}
            onLevel={(level) => setForm((f) => ({ ...f, level }))}
            onFormat={(format) => setForm((f) => ({ ...f, format }))}
          />
          <TextField
            label={t('create.description')}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder={t('create.descriptionPh')}
          />
          <div className={styles.actions}>
            <Button type="submit" variant="primary" loading={loading}>
              {t('create.submit')}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate(HOME_ROUTE)}>
              {t('create.cancel')}
            </Button>
          </div>
          {/* Курс заводится черновиком: сказать это ДО нажатия дешевле, чем объяснять после. */}
          <p className={styles.note}>{t('create.note')}</p>
        </form>
      </div>
    </div>
  );
}
