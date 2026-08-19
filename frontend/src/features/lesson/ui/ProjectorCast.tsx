import { MonitorUp, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useCreateProjectorCodeMutation } from '@/entities/graphql/generated';
import { Button } from '@/shared/ui';
import { ICON_SM } from '@/shared/ui/iconSizes';

import styles from './projector.module.css';

/**
 * «Вывести на второй экран» — the teacher's side of the cast (masterplan F3).
 *
 * The code is read off this screen and typed on the tablet. Nothing else travels: the token
 * is minted server-side when the code is redeemed, and it can only watch. The panel says so,
 * because a teacher putting a lesson on a classroom projector deserves to know exactly what
 * the second screen can and cannot do.
 */
export function ProjectorCast({ sessionId }: { sessionId: string }) {
  const { t } = useTranslation('room');
  const [open, setOpen] = useState(false);
  const [cast, { data, loading, error }] = useCreateProjectorCodeMutation();
  const code = data?.createProjectorCode;

  async function issue() {
    setOpen(true);
    await cast({ variables: { sessionId } }).catch(() => undefined);
  }

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        icon={<MonitorUp size={ICON_SM} />}
        onClick={() => void issue()}
      >
        {t('projector.cast')}
      </Button>

      {open && (
        <div className={styles.castPanel} role="dialog" aria-label={t('projector.title')}>
          <div className={styles.castHead}>
            <span className={styles.castTitle}>{t('projector.title')}</span>
            <button
              type="button"
              className={styles.castClose}
              onClick={() => setOpen(false)}
              aria-label={t('projector.close')}
            >
              <X size={ICON_SM} />
            </button>
          </div>
          <p className={styles.castBody}>
            {t('projector.body', { url: `${window.location.origin}/projector` })}
          </p>
          {loading && !code ? (
            <p className={styles.castBody}>…</p>
          ) : error && !code ? (
            <p className={styles.castBody} role="alert">
              {t('projector.joinFailed')}
            </p>
          ) : code ? (
            <>
              <p className={styles.castCode} aria-label={t('projector.code')}>
                {code.code}
              </p>
              <p className={styles.castMeta}>
                {t('projector.expires', {
                  time: new Intl.DateTimeFormat('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit',
                  }).format(new Date(code.expiresAt)),
                })}
              </p>
            </>
          ) : null}
          <p className={styles.castHint}>{t('projector.hint')}</p>
          <Button size="sm" variant="ghost" onClick={() => void issue()}>
            {t('projector.again')}
          </Button>
        </div>
      )}
    </>
  );
}
