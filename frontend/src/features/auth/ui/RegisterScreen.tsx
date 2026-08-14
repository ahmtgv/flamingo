import { ICON_SM } from '@/shared/ui/iconSizes';
import { AlertCircle, ArrowLeft, Mail, ShieldCheck, Users } from 'lucide-react';
import { type ChangeEvent, type FormEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { failureKind, serverMessage } from '@/shared/lib/requestFailure';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import type { RegisterUserInput } from '@/entities/graphql/generated';
import { useRegisterUserMutation } from '@/entities/graphql/generated';
import { Button, Card, Checkbox, FieldRow, Segmented, TextField } from '@/shared/ui';

import { applyAuth } from '../model/auth';
import { isUiRole, toGqlRole, type UiRole } from '../model/roles';
import {
  ageBandFromBirthDate,
  type AgeBandUi,
  EMPTY_REGISTER,
  type Errors,
  validateRegister,
} from '../model/validation';
import { AuthLayout } from './AuthLayout';
import styles from './auth.module.css';

const IS_PREVIEW = import.meta.env.VITE_PREVIEW === '1';

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
  // R-08: плашку надо не только показать, но и подвести к ней человека.
  const formErrorRef = useRef<HTMLParagraphElement>(null);
  const [registerUser, { loading }] = useRegisterUserMutation();

  const set = (key: keyof typeof values) => (e: ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    // 🔴 R-07: человек исправил — красное гаснет. Раньше оно оставалось до следующей отправки,
    // и экран продолжал ругаться на то, чего уже нет.
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };
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
      // 🔴 R-04 (аудит 14.08): согласие 152-ФЗ доезжает до сервера. Раньше `values.consent`
      // спрашивали и выбрасывали: поля не было ни во входе мутации, ни в бэкенде, и
      // юридически согласие не существовало нигде. Сервер к тому же теперь откажет без него
      // (`accounts/services.register_user`) — по вычисленному возрасту, а не по форме.
      consent152fz: values.consent,
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
        // 🔴 R-09: /start — утверждённый лист 00. Новый преподаватель попадал в архивный
        // кабинет, а после F5 — в новый: ровно то ощущение «продукт собран из двух разных».
        navigate('/start', { replace: true });
      }
    } catch (error) {
      // 🔴 R-06: «сервер не ответил» и «почта занята» — разные события, и текст у них разный.
      const kind = failureKind(error);
      setFormError(
        kind === 'unreachable'
          ? t('register.unreachable')
          : (serverMessage(error) ?? t('common:errors.generic')),
      );
      // 🔴 R-08: плашка вверху длинной формы без фокуса выглядит как «ничего не произошло».
      requestAnimationFrame(() => formErrorRef.current?.focus());
    }
  }

  const isStudent = role === 'student';
  // 🔴 R-05: дата рождения — источник правды о возрасте, и она же у сервера. Если человек
  // выбрал одну группу, а дата говорит другое, показываем это ДО отправки: иначе он получит
  // отказ после, не поняв, за что.
  const derivedAge = ageBandFromBirthDate(values.birthDate);
  const ageMismatch = isStudent && derivedAge !== null && derivedAge !== age;

  const showOwnEmail = !(isStudent && age === 'junior');
  const showParentEmail = isStudent && (age === 'junior' || age === 'teen');

  return (
    <AuthLayout>
      {IS_PREVIEW && (
        /* 🔴 R-17: витрина обязана сказать, что запись закрыта, а не делать вид, что форма
           заведёт учётную запись. Аудит §0.1: дефект был не в том, что регистрация не
           работает, а в том, что она врала «Что-то пошло не так». */
        <p className={styles.showcaseNotice} role="status">
          {t('showcase.notice')}
        </p>
      )}
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
              {ageMismatch && (
                <p className={styles.hint} role="status">
                  {t('register.ageMismatch', { band: t(`register.age.${derivedAge}`) })}{' '}
                  <button
                    type="button"
                    className={styles.linkBtn}
                    onClick={() => derivedAge && setAge(derivedAge)}
                  >
                    {t('register.ageMismatchFix')}
                  </button>
                </p>
              )}
            </div>
          )}

          {formError && (
            /* R-08: tabIndex={-1} — чтобы плашке можно было отдать фокус программно. Без
               этого нажатие на длинной форме выглядит как «ничего не произошло». */
            <p className={styles.formError} role="alert" tabIndex={-1} ref={formErrorRef}>
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
              /* 🔴 R-10: у младшего логином становится ПОЧТА РОДИТЕЛЯ — и родитель потом не
                 заведёт свою учётную запись на тот же адрес. Раньше об этом не говорили нигде;
                 человек узнавал на второй регистрации, когда менять уже поздно. */
              hint={age === 'junior' ? t('register.juniorSharesParentEmail') : undefined}
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

          {/* 🔴 Б3 (PROMPT_16, R-15). Согласие спрашивается у ВСЕХ ролей: 152-ФЗ требует его
              от любого субъекта, а блок рисовался только младшему ученику — то есть у
              преподавателя, родителя и администратора правового основания обработки не было.
              Разница между взрослым и ребёнком — в том, КТО даёт согласие, и это сказано в
              тексте; проверка на сервере одна. */}
          <Checkbox
            boxed
            checked={values.consent}
            invalid={!!errors.consent}
            onChange={(e) => setValues((v) => ({ ...v, consent: e.target.checked }))}
          >
            {isStudent && age === 'junior' ? t('consent.labelJunior') : t('consent.label')}{' '}
            <a className={styles.linkBtn} href="/policy" target="_blank" rel="noreferrer noopener">
              {t('consent.policy')}
            </a>{' '}
            {t('consent.and')}{' '}
            <a className={styles.linkBtn} href="/offer" target="_blank" rel="noreferrer noopener">
              {t('consent.offer')}
            </a>
          </Checkbox>
          {errors.consent && <p className={styles.consentError}>{t(errors.consent)}</p>}

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
