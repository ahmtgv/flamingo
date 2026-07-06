import { ICON_SM } from '@/shared/ui/iconSizes';
import { AlertCircle } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useLoginMutation } from '@/entities/graphql/generated';
import { Button, Card, TextField } from '@/shared/ui';

import { applyAuth } from '../model/auth';
import { type Errors, validateLogin } from '../model/validation';
import { AuthLayout } from './AuthLayout';
import styles from './auth.module.css';

export function LoginScreen() {
  const { t } = useTranslation(['auth', 'common']);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [login, { loading }] = useLoginMutation();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const found = validateLogin(email, password);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    try {
      const { data } = await login({ variables: { email, password } });
      if (data?.login) {
        applyAuth(data.login);
        navigate('/app', { replace: true });
      }
    } catch {
      setFormError(t('login.failed'));
    }
  }

  return (
    <AuthLayout>
      <div className={styles.head}>
        <span className={styles.eyebrow}>{t('login.eyebrow')}</span>
        <h1 className={styles.title}>{t('login.title')}</h1>
        <p className={styles.subtitle}>{t('login.subtitle')}</p>
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
            label={t('fields.email')}
            requiredMark
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email ? t(errors.email) : undefined}
            placeholder={t('placeholders.email')}
            autoComplete="email"
          />
          <TextField
            label={t('fields.password')}
            requiredMark
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password ? t(errors.password) : undefined}
            autoComplete="current-password"
          />
          <div className={styles.subActions}>
            <button type="button" className={styles.link} onClick={() => navigate('/reset')}>
              {t('login.forgot')}
            </button>
          </div>
          <Button type="submit" variant="primary" block loading={loading}>
            {t('login.submit')}
          </Button>
        </form>
      </Card>
      <p className={styles.footer}>
        {t('login.noAccount')}{' '}
        <button type="button" className={styles.link} onClick={() => navigate('/register')}>
          {t('login.signUp')}
        </button>
      </p>
    </AuthLayout>
  );
}
