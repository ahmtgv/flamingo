import { ICON_LG } from '@/shared/ui/iconSizes';
import { Check } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useResetPasswordMutation } from '@/entities/graphql/generated';
import { Button, Card, TextField } from '@/shared/ui';

import { type Errors, validateNewPassword } from '../model/validation';
import { AuthLayout } from './AuthLayout';
import styles from './auth.module.css';

/** Set a new password from an emailed reset link (/reset-password?token=...). */
export function ResetConfirmScreen() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [resetPassword, { loading }] = useResetPasswordMutation();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const found = validateNewPassword(password);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    try {
      const { data } = await resetPassword({ variables: { token, newPassword: password } });
      if (data?.resetPassword) setDone(true);
      else setFormError(t('reset.invalidLink'));
    } catch {
      setFormError(t('reset.invalidLink'));
    }
  }

  if (!token) {
    return (
      <AuthLayout>
        <Card className={styles.success}>
          <h2 className={styles.successTitle}>{t('reset.invalidLink')}</h2>
          <Button variant="secondary" onClick={() => navigate('/login')}>
            {t('reset.toLogin')}
          </Button>
        </Card>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout>
        <Card className={styles.success}>
          <div className={styles.successIcon}>
            <Check size={ICON_LG} strokeWidth={2.5} />
          </div>
          <h2 className={styles.successTitle}>{t('reset.doneTitle')}</h2>
          <p className={styles.successText}>{t('reset.doneText')}</p>
          <Button variant="primary" onClick={() => navigate('/login')}>
            {t('reset.toLogin')}
          </Button>
        </Card>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className={styles.head}>
        <span className={styles.eyebrow}>{t('reset.eyebrow')}</span>
        <h1 className={styles.title}>{t('reset.confirmTitle')}</h1>
        <p className={styles.subtitle}>{t('reset.confirmSubtitle')}</p>
      </div>
      <Card>
        <form noValidate onSubmit={handleSubmit}>
          {formError && (
            <p className={styles.formError} role="alert">
              {formError}
            </p>
          )}
          <TextField
            label={t('fields.newPassword')}
            requiredMark
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password ? t(errors.password) : undefined}
            placeholder={t('placeholders.password')}
            hint={t('hints.password')}
            autoComplete="new-password"
          />
          <Button type="submit" variant="primary" block loading={loading} className={styles.submit}>
            {t('reset.confirmSubmit')}
          </Button>
        </form>
      </Card>
    </AuthLayout>
  );
}
