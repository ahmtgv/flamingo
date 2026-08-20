import { ICON_LG, ICON_SM } from '@/shared/ui/iconSizes';
import { ArrowLeft, Check } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { failureKind } from '@/shared/lib/requestFailure';
import { useNavigate } from 'react-router-dom';

import { useRequestPasswordResetMutation } from '@/entities/graphql/generated';
import { Button, Card, TextField } from '@/shared/ui';

import { type Errors, validateEmail } from '../model/validation';
import { AuthLayout } from './AuthLayout';
import styles from './auth.module.css';

export function ResetRequestScreen() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [requestReset, { loading }] = useRequestPasswordResetMutation();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const found = validateEmail(email);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    try {
      /**
       * 🔴 ОТВЕТ СЕРВЕРА ТЕПЕРЬ ЗНАЧИТ ДЕЛО (наряд 37 §3, найдено 18.08).
       *
       * Почтовой отправки в продукте не было вовсе: ссылка писалась в лог сервера. Экран при
       * этом показывал «Проверьте почту» — то есть человек, забывший пароль, ждал письма,
       * которого никто не отправлял, и вернуться не мог ничем.
       *
       * `false` значит «мы не умеем отправлять», а не «такой почты нет»: про учётную запись
       * ответ по-прежнему молчит — иначе список почт продукта собирается перебором.
       */
      const answer = await requestReset({ variables: { email } });
      if (answer.data?.requestPasswordReset === false) {
        setFormError(t('reset.unavailable'));
        return;
      }
      setSent(true);
    } catch (error) {
      // 🔴 R-03: «Проверьте почту» показывалось ВСЕГДА, даже когда запрос упал. Человек ждёт
      // письма, которого никто не отправлял.
      //
      // ⚠️ Разницу между «адреса нет» и «пароль не тот» по-прежнему не показываем — по такому
      // ответу список почт продукта собирается скриптом. Но «сервер не ответил» — не сведения
      // об адресе, и молчать о нём не за чем.
      if (failureKind(error) === 'unreachable') {
        setFormError(t('reset.unreachable'));
        return;
      }
      setSent(true);
    }
  }

  if (sent) {
    return (
      <AuthLayout back={{ label: t('nav.toLogin'), to: '/login' }}>
        <Card className={styles.success}>
          <div className={styles.successIcon}>
            <Check size={ICON_LG} strokeWidth={2.5} />
          </div>
          <h2 className={styles.successTitle}>{t('reset.sentTitle')}</h2>
          <p className={styles.successText}>{t('reset.sentText')}</p>
          <Button variant="secondary" onClick={() => navigate('/login')}>
            {t('reset.backToLogin')}
          </Button>
        </Card>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout back={{ label: t('nav.toLogin'), to: '/login' }}>
      <button type="button" className={styles.back} onClick={() => navigate('/login')}>
        <ArrowLeft size={ICON_SM} /> {t('reset.backToLogin')}
      </button>
      <div className={styles.head}>
        <h1 className={styles.title}>{t('reset.title')}</h1>
        <p className={styles.subtitle}>{t('reset.subtitle')}</p>
      </div>
      <Card>
        <form noValidate onSubmit={handleSubmit}>
          <TextField
            label={t('fields.email')}
            requiredMark
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email ? t(errors.email) : undefined}
            placeholder={t('placeholders.email')}
            autoComplete="email"
          />
          {formError && (
            <p className={styles.formError} role="alert">
              {formError}
            </p>
          )}
          <Button type="submit" variant="primary" block loading={loading}>
            {t('reset.submit')}
          </Button>
        </form>
      </Card>
    </AuthLayout>
  );
}
