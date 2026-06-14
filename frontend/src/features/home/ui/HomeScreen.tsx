import { useApolloClient } from '@apollo/client';
import { LogOut, ShieldCheck } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useAppDispatch } from '@/app/hooks';
import { setAgeMode } from '@/app/uiSlice';
import { useMeQuery } from '@/entities/graphql/generated';
import { clearSession } from '@/shared/lib/session';
import { Button, Card, Logo } from '@/shared/ui';

import styles from './home.module.css';

/**
 * Minimal authenticated landing — proves protected routing + `me`. The real
 * role cabinets (student/parent/teacher/admin) arrive in the next session.
 */
export function HomeScreen() {
  const { t } = useTranslation(['auth', 'common']);
  const navigate = useNavigate();
  const client = useApolloClient();
  const dispatch = useAppDispatch();
  const { data, loading } = useMeQuery();
  const me = data?.me;

  // Junior pupils get the age-adapted (kids) token set.
  useEffect(() => {
    dispatch(setAgeMode(me?.studentProfile?.ageBand === 'JUNIOR' ? 'kids' : 'default'));
  }, [me, dispatch]);

  async function handleSignOut() {
    clearSession();
    dispatch(setAgeMode('default'));
    await client.clearStore();
    navigate('/login', { replace: true });
  }

  return (
    <div className={styles.shell}>
      <header className={styles.bar}>
        <Logo />
        <Button
          variant="secondary"
          size="sm"
          icon={<LogOut size={16} />}
          onClick={handleSignOut}
        >
          {t('home.signOut')}
        </Button>
      </header>
      <main className={styles.main}>
        <Card className={styles.card}>
          {loading && !me ? (
            <p className={styles.muted}>{t('common:actions.loading')}</p>
          ) : me ? (
            <>
              <p className={styles.eyebrow}>{t('home.welcome')}</p>
              <h1 className={styles.name}>
                {me.firstName} {me.lastName}
              </h1>
              <dl className={styles.meta}>
                <div>
                  <dt>{t('home.roleLabel')}</dt>
                  <dd>{t(`home.roles.${me.role}`)}</dd>
                </div>
                <div>
                  <dt>{t('home.emailLabel')}</dt>
                  <dd>{me.email}</dd>
                </div>
              </dl>
              <p className={styles.placeholder}>
                <ShieldCheck size={16} aria-hidden="true" /> {t('home.placeholder')}
              </p>
            </>
          ) : null}
        </Card>
      </main>
    </div>
  );
}
