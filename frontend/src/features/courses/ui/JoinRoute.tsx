import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { entryRoute } from '@/app/entryRoute';
import { useSession } from '@/shared/hooks/useSession';
import { withReturnTo } from '@/shared/lib/returnTo';
import { Button } from '@/shared/ui';

import { JoinHalf } from './InviteScreen';
import styles from './invite.module.css';

/**
 * Приход по ссылке `/join/:code`.
 *
 * Человек, которого позвали, попадает сюда прямо из мессенджера — код уже в адресе, набирать
 * его руками не нужно.
 *
 * 🔴 Адрес открытый намеренно. Под `ProtectedRoute` посторонний увидел бы форму входа и ни
 * слова о том, куда его звали: приглашение превращается в «представьтесь». Здесь он сначала
 * читает, на какой курс пришёл, и уже потом решает завести учётную запись — а `next` вернёт
 * его сюда же, с кодом в адресе, и вход останется одним нажатием.
 *
 * ⚠️ Расхождение с листом, названное вслух: лист обещает «регистрация для первого входа не
 * нужна». Курс закрепляется за учётной записью — без неё некому хранить работы и оценки,
 * поэтому вход всё-таки нужен. Обещание с листа не воспроизводим, чтобы не соврать в лицо.
 */
export function JoinRoute() {
  const { code = '' } = useParams();
  const { t } = useTranslation('courses');
  const { status } = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  const guest = status === 'unauthenticated';

  return (
    <div className={styles.shell}>
      <div className={styles.page}>
        {guest ? (
          <section className={styles.half} aria-label={t('invite.pupilSide')}>
            <span className={styles.kicker}>{t('invite.pupilSide')}</span>
            <h2 className={styles.title}>{t('invite.guestTitle')}</h2>
            <p className={styles.lead}>{t('invite.guestLead')}</p>
            <p className={styles.code}>{code.toUpperCase()}</p>
            <div className={styles.form}>
              <Button
                variant="primary"
                onClick={() =>
                  navigate(withReturnTo(entryRoute(), `${location.pathname}${location.search}`))
                }
              >
                {t('invite.guestGo')}
              </Button>
              <p className={styles.note}>{t('invite.pupilNote')}</p>
            </div>
          </section>
        ) : (
          <JoinHalf presetCode={code.toUpperCase()} />
        )}
      </div>
    </div>
  );
}
