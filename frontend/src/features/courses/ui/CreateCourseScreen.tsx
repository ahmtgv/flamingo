import { ICON_SM } from '@/shared/ui/iconSizes';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { type CourseLevel, useCreateCourseMutation } from '@/entities/graphql/generated';
import { Button, Card, SelectField, TextField } from '@/shared/ui';

import { CoursesLayout } from './CoursesLayout';
import styles from './courses.module.css';

const LEVELS: CourseLevel[] = [
  'GRADE_1', 'GRADE_2', 'GRADE_3', 'GRADE_4', 'GRADE_5', 'GRADE_6',
  'GRADE_7', 'GRADE_8', 'GRADE_9', 'GRADE_10', 'GRADE_11', 'ADULT',
];

export function CreateCourseScreen() {
  const { t } = useTranslation(['courses', 'common']);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    subject: '',
    level: 'GRADE_7' as CourseLevel,
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
    <CoursesLayout>
      <div className={styles.content}>
        <button type="button" className={styles.back} onClick={() => navigate('/courses')}>
          <ArrowLeft size={ICON_SM} /> {t('catalog.title')}
        </button>
        <div className={styles.pageHead}>
          <div>
            <h1 className={styles.pageTitle}>{t('create.title')}</h1>
            <p className={styles.pageSub}>{t('create.subtitle')}</p>
          </div>
        </div>
        <Card>
          <form noValidate onSubmit={handleSubmit}>
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
            <SelectField
              label={t('create.level')}
              value={form.level}
              onChange={(e) => setForm((f) => ({ ...f, level: e.target.value as CourseLevel }))}
            >
              {LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {t(`level.${lvl}`)}
                </option>
              ))}
            </SelectField>
            <TextField
              label={t('create.description')}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder={t('create.descriptionPh')}
            />
            <div className={styles.actionsRow}>
              <Button type="submit" variant="primary" loading={loading}>
                {t('create.submit')}
              </Button>
              <Button type="button" variant="secondary" onClick={() => navigate('/courses')}>
                {t('create.cancel')}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </CoursesLayout>
  );
}
