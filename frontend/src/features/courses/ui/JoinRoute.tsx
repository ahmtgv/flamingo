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
 * ⚠️ Расхождение с листом, названное вслух и НЕ закрытое решением: лист обещает
 * «регистрация для первого входа не нужна», а здесь вход всё-таки нужен — курс
 * закрепляется за учётной записью, иначе работы и оценки некому хранить. Дизайнер сделал
 * вход по коду без учётной записи осознанно; ревьюер снял с себя запрет на него как
 * выдуманный (§55.2), и вопрос «брать ли согласие у пришедшего без учётной записи»
 * остаётся ОТКРЫТЫМ ВОПРОСОМ ВЛАДЕЛЬЦУ. Пока он открыт, экран не обещает того, чего не
 * делает: говорит прямо, что нужно назвать себя, и возвращает сюда же.
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
