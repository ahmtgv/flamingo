import { ICON_SM } from '@/shared/ui/iconSizes';
import { AlertCircle, ArrowLeft, Mail, ShieldCheck, Users } from 'lucide-react';
import { type ChangeEvent, type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import type { RegisterUserInput } from '@/entities/graphql/generated';
import { useRegisterUserMutation } from '@/entities/graphql/generated';
import { Button, Card, Checkbox, FieldRow, Segmented, TextField } from '@/shared/ui';

import { applyAuth } from '../model/auth';
import { isUiRole, toGqlRole, type UiRole } from '../model/roles';
import {
  type AgeBandUi,
  EMPTY_REGISTER,
  type Errors,
  validateRegister,
} from '../model/validation';
import { AuthLayout } from './AuthLayout';
import styles from './auth.module.css';

const AGE_OPTIONS: AgeBandUi[] = ['junior', 'teen', 'adult'];

export function RegisterScreen() {
  const params = useParams();
  const role = params.role ?? '';
  if (!isUiRole(role)) {
    return <Navigate to="/register" replace />;
  }
  return <RegisterForm role={role} />;
}

function RegisterForm({ role }: { role: UiRole }) {
  const { t } = useTranslation(['auth', 'common']);
  const navigate = useNavigate();
  const [values, setValues] = useState({ ...EMPTY_REGISTER });
  const [errors, setErrors] = useState<Errors>({});
  const [age, setAge] = useState<AgeBandUi>('teen');
  const [formError, setFormError] = useState<string | null>(null);
  const [registerUser, { loading }] = useRegisterUserMutation();

  const set = (key: keyof typeof values) => (e: ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));
  const err = (key: string) => (errors[key] ? t(errors[key]) : undefined);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const found = validateRegister(values, role, age);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const juniorStudent = role === 'student' && age === 'junior';
    const input: RegisterUserInput = {
      // A parent-managed junior logs in via the parent's email (MVP simplification;
      // the dedicated parent->child flow via addChild lands with the parent cabinet).
      email: juniorStudent ? values.parentEmail : values.email,
      password: values.password,
      firstName: values.firstName,
      lastName: values.lastName,
      role: toGqlRole(role),
      locale: 'ru',
    };
    if (role === 'student') {
      input.student = {
        birthDate: values.birthDate || null,
        gradeLevel: values.grade || null,
        parentEmail: age === 'junior' || age === 'teen' ? values.parentEmail : null,
      };
    }
    if (role === 'teacher') {
      input.teacher = { specialty: values.specialty || null };
    }

    try {
      const { data } = await registerUser({ variables: { input } });
      if (data?.registerUser) {
        applyAuth(data.registerUser);
        navigate('/app', { replace: true });
      }
    } catch {
      setFormError(t('common:errors.generic'));
    }
  }

  const isStudent = role === 'student';
  const showOwnEmail = !(isStudent && age === 'junior');
  const showParentEmail = isStudent && (age === 'junior' || age === 'teen');

  return (
    <AuthLayout>
      <button type="button" className={styles.back} onClick={() => navigate('/register')}>
        <ArrowLeft size={ICON_SM} /> {t('register.backToRoles')}
      </button>

      <div className={styles.head}>
        <span className={styles.eyebrow}>{t(`roles.${role}.title`)}</span>
        <h1 className={styles.title}>{t('register.title')}</h1>
        <p className={styles.subtitle}>
          {isStudent ? t('register.subtitleStudent') : t('register.subtitleDefault')}
        </p>
      </div>

      <Card>
        <form noValidate onSubmit={handleSubmit}>
          {isStudent && (
            <div className={styles.segWrap}>
              <Segmented
                ariaLabel={t('register.ageGroupLabel')}
                value={age}
                onChange={(next) => {
                  setAge(next);
                  setErrors({});
                }}
                options={AGE_OPTIONS.map((value) => ({ value, label: t(`register.age.${value}`) }))}
              />
            </div>
          )}

          {formError && (
            <p className={styles.formError} role="alert">
              <AlertCircle size={ICON_SM} aria-hidden="true" />
              {formError}
            </p>
          )}

          {isStudent ? (
            <>
              <TextField
                label={age === 'junior' ? t('fields.childFirstName') : t('fields.firstName')}
                requiredMark
                value={values.firstName}
                onChange={set('firstName')}
                error={err('firstName')}
                placeholder={t('placeholders.firstName')}
                autoComplete="given-name"
              />
              <TextField
                label={t('fields.lastName')}
                requiredMark
                value={values.lastName}
                onChange={set('lastName')}
                error={err('lastName')}
                placeholder={t('placeholders.lastName')}
                autoComplete="family-name"
              />
              <FieldRow>
                <TextField
                  label={t('fields.grade')}
                  value={values.grade}
                  onChange={set('grade')}
                  placeholder={t('placeholders.grade')}
                />
                <TextField
                  label={t('fields.birthDate')}
                  requiredMark
                  type="date"
                  value={values.birthDate}
                  onChange={set('birthDate')}
                  error={err('birthDate')}
                />
              </FieldRow>
            </>
          ) : (
            <FieldRow>
              <TextField
                label={t('fields.firstName')}
                requiredMark
                value={values.firstName}
                onChange={set('firstName')}
                error={err('firstName')}
                placeholder={t('placeholders.firstName')}
                autoComplete="given-name"
              />
              <TextField
                label={t('fields.lastName')}
                requiredMark
                value={values.lastName}
                onChange={set('lastName')}
                error={err('lastName')}
                placeholder={t('placeholders.lastName')}
                autoComplete="family-name"
              />
            </FieldRow>
          )}

          {role === 'teacher' && (
            <TextField
              label={t('fields.specialty')}
              requiredMark
              value={values.specialty}
              onChange={set('specialty')}
              error={err('specialty')}
              placeholder={t('placeholders.specialty')}
            />
          )}

          {showOwnEmail && (
            <TextField
              label={t('fields.email')}
              requiredMark
              type="email"
              value={values.email}
              onChange={set('email')}
              error={err('email')}
              placeholder={t('placeholders.email')}
              autoComplete="email"
            />
          )}

          {showParentEmail && (
            <TextField
              label={t('fields.parentEmail')}
              requiredMark
              type="email"
              value={values.parentEmail}
              onChange={set('parentEmail')}
              error={err('parentEmail')}
              placeholder={t('placeholders.parentEmail')}
              hint={age === 'junior' ? t('hints.parentManaged') : undefined}
            />
          )}

          <TextField
            label={t('fields.password')}
            requiredMark
            type="password"
            value={values.password}
            onChange={set('password')}
            error={err('password')}
            placeholder={t('placeholders.password')}
            hint={t('hints.password')}
            autoComplete="new-password"
          />

          {isStudent && age === 'junior' && (
            <>
              <Checkbox
                boxed
                checked={values.consent}
                invalid={!!errors.consent}
                onChange={(e) => setValues((v) => ({ ...v, consent: e.target.checked }))}
              >
                {t('consent.label')}
              </Checkbox>
              {errors.consent && <p className={styles.consentError}>{t(errors.consent)}</p>}
            </>
          )}

          {isStudent && age === 'teen' && (
            <p className={styles.note}>
              <Mail aria-hidden="true" /> {t('register.notes.teen')}
            </p>
          )}
          {role === 'parent' && (
            <p className={styles.note}>
              <Users aria-hidden="true" /> {t('register.notes.parent')}
            </p>
          )}
          {role === 'teacher' && (
            <p className={styles.note}>
              <ShieldCheck aria-hidden="true" /> {t('register.notes.teacher')}
            </p>
          )}
          {role === 'admin' && (
            <p className={styles.note}>
              <ShieldCheck aria-hidden="true" /> {t('register.notes.admin')}
            </p>
          )}

          <Button type="submit" variant="primary" block loading={loading} className={styles.submit}>
            {t('register.submit')}
          </Button>
        </form>
      </Card>

      <p className={styles.footer}>
        {t('roleSelect.haveAccount')}{' '}
        <button type="button" className={styles.link} onClick={() => navigate('/login')}>
          {t('roleSelect.signIn')}
        </button>
      </p>
    </AuthLayout>
  );
}
