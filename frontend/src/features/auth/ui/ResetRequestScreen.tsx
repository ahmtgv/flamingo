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
      await requestReset({ variables: { email } });
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
      <AuthLayout>
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
    <AuthLayout>
      <button type="button" className={styles.back} onClick={() => navigate('/login')}>
        <ArrowLeft size={ICON_SM} /> {t('reset.backToLogin')}
      </button>
      <div className={styles.head}>
        <span className={styles.eyebrow}>{t('reset.eyebrow')}</span>
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
          <Button type="submit" variant="primary" block loading={loading} className={styles.submit}>
            {t('reset.submit')}
          </Button>
        </form>
      </Card>
    </AuthLayout>
  );
}
