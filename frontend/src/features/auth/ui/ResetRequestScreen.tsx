import { ICON_LG, ICON_SM } from '@/shared/ui/iconSizes';
import { ArrowLeft, Check } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const [requestReset, { loading }] = useRequestPasswordResetMutation();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const found = validateEmail(email);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    try {
      await requestReset({ variables: { email } });
    } catch {
      /* never reveal whether the address exists */
    }
    setSent(true);
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
          <Button type="submit" variant="primary" block loading={loading} className={styles.submit}>
            {t('reset.submit')}
          </Button>
        </form>
      </Card>
    </AuthLayout>
  );
}
