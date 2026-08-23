import { ICON_MD, ICON_SM } from '@/shared/ui/iconSizes';
import { AlertCircle, BarChart3, Bell, LayoutDashboard, UserPlus } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { type MeQuery, useAddChildMutation } from '@/entities/graphql/generated';
import { Avatar, Badge, Button, Card, Checkbox, FieldRow, MutedDoor, TextField } from '@/shared/ui';

import { CabinetLayout, type CabinetNavItem } from './CabinetLayout';
import styles from './cabinet.module.css';
import { Empty } from './Empty';
import { initialsOf } from './initials';

type Me = NonNullable<MeQuery['me']>;

const EMPTY = { firstName: '', lastName: '', grade: '', birthDate: '', childEmail: '', consent: false };

export function ParentCabinet({ me, refetchMe }: { me: Me; refetchMe: () => Promise<unknown> }) {
  const { t } = useTranslation(['cabinet', 'common']);
  const children = me.parentProfile?.children ?? [];

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [addChild, { loading }] = useAddChildMutation();

  const err = (k: string) => (errors[k] ? t(errors[k]) : undefined);
  const reset = () => {
    setForm({ ...EMPTY });
    setErrors({});
    setFormError(null);
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const found: Record<string, string> = {};
    if (!form.firstName.trim()) found.firstName = 'cabinet:validation.firstName';
    if (!form.lastName.trim()) found.lastName = 'cabinet:validation.lastName';
    if (!form.consent) found.consent = 'cabinet:validation.consent';
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    try {
      await addChild({
        variables: {
          input: {
            firstName: form.firstName,
            lastName: form.lastName,
            consent152fz: form.consent,
            gradeLevel: form.grade || null,
            birthDate: form.birthDate || null,
            childEmail: form.childEmail || null,
          },
        },
      });
      await refetchMe();
      reset();
      setOpen(false);
    } catch {
      setFormError(t('cabinet:errors.generic'));
    }
  }

  const nav: CabinetNavItem[] = [
    { key: 'children', label: t('nav.children'), icon: LayoutDashboard, active: true },
    { key: 'analytics', label: t('nav.analytics'), icon: BarChart3 },
    { key: 'notifications', label: t('nav.notifications'), icon: Bell },
  ];

  return (
    <CabinetLayout nav={nav} user={{ name: me.firstName, initials: initialsOf(me.firstName, me.lastName) }}>
      <div className={styles.content}>
        <div className={styles.pageHead}>
          <h1 className={styles.pageTitle}>{t('parent.title')}</h1>
          <p className={styles.pageSub}>{t('parent.sub')}</p>
        </div>

        <div className={styles.sectionActions}>
          <span />
          {/* §59: кабинет родителя не рисуется в этот заход. Дверь названа и приглушена,
              причина рядом: ребёнка записывают без родителя — по ссылке преподавателя. */}
          <MutedDoor label={t('parent.addChild')} why={t('common:soon.children')} />
        </div>

        {open && (
          <Card style={{ marginBottom: 'var(--space-4)' }}>
            <form noValidate onSubmit={handleSubmit}>
              {formError && (
                <p className={styles.formError} role="alert">
                  <AlertCircle size={ICON_SM} aria-hidden="true" />
                  {formError}
                </p>
              )}
              <FieldRow>
                <TextField
                  label={t('parent.form.firstName')}
                  requiredMark
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                  error={err('firstName')}
                  placeholder={t('parent.form.firstNamePh')}
                />
                <TextField
                  label={t('parent.form.lastName')}
                  requiredMark
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                  error={err('lastName')}
                  placeholder={t('parent.form.lastNamePh')}
                />
              </FieldRow>
              <FieldRow>
                <TextField
                  label={t('parent.form.grade')}
                  value={form.grade}
                  onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value }))}
                  placeholder={t('parent.form.gradePh')}
                />
                <TextField
                  label={t('parent.form.birthDate')}
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))}
                />
              </FieldRow>
              <TextField
                label={t('parent.form.childEmail')}
                type="email"
                value={form.childEmail}
                onChange={(e) => setForm((f) => ({ ...f, childEmail: e.target.value }))}
              />
              <Checkbox
                boxed
                checked={form.consent}
                invalid={!!errors.consent}
                onChange={(e) => setForm((f) => ({ ...f, consent: e.target.checked }))}
              >
                {t('consent.label')}
              </Checkbox>
              {errors.consent && <p className={styles.consentError}>{t(errors.consent)}</p>}
              <div className={styles.formActions}>
                <Button type="submit" variant="primary" loading={loading}>
                  {t('parent.form.submit')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    reset();
                    setOpen(false);
                  }}
                >
                  {t('parent.form.cancel')}
                </Button>
              </div>
            </form>
          </Card>
        )}

        <Card>
          {children.length === 0 ? (
            <Empty icon={<UserPlus size={ICON_MD} />} text={t('parent.empty')} />
          ) : (
            children.map((child) => (
              <div className={styles.childCard} key={child.user.id}>
                <Avatar initials={initialsOf(child.user.firstName, child.user.lastName)} />
                <div className={styles.childInfo}>
                  <div className={styles.childName}>
                    {child.user.displayName}
                  </div>
                  <div className={styles.childMeta}>
                    {child.gradeLevel || t(`ageBand.${child.ageBand}`)}
                  </div>
                </div>
                <Badge tone="neutral">{t(`ageBand.${child.ageBand}`)}</Badge>
              </div>
            ))
          )}
        </Card>

        <p className={styles.pageSub} style={{ fontSize: 'var(--text-caption)' }}>
          {t('parent.note')}
        </p>
      </div>
    </CabinetLayout>
  );
}
