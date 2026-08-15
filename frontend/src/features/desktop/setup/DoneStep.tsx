import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useCompleteDeviceSetupMutation } from '@/entities/graphql/generated';

import { getSessionSnapshot } from '@/shared/lib/session';

import { stepFailureKey } from './stepFailure';
import styles from './setup.module.css';

/**
 * Шаг 5 — готово (atlas D2).
 *
 * A summary rather than a congratulation: four lines saying what is now true about this
 * machine, and three things a teacher might actually want to do next. The last line matters
 * more than it looks — «приложение можно закрывать: пока урока нет, оно ничего не делает» —
 * because a program that has just claimed to be hosting lessons sounds like one you have to
 * babysit, and this one does not.
 */
export function DoneStep({
  teacherName,
  attentionOn,
  groupSize,
  onOpenCabinet,
}: {
  /** `null` — имени НЕ ЗНАЕМ. Это не то же самое, что пустая строка, см. §Б0-септ ниже. */
  teacherName: string | null;
  attentionOn: boolean;
  groupSize: number | null;
  onOpenCabinet: () => void;
}) {
  const { t } = useTranslation('desktop');
  const [complete] = useCompleteDeviceSetupMutation();
  const [failed, setFailed] = useState<string | null>(null);

  const finish = async () => {
    // The server checks the mandatory copy here too (§19.1) — a wizard is a sequence of
    // components and a component can be skipped by a URL.
    setFailed(null);
    try {
      await complete();
    } catch (error) {
      // Последняя кнопка мастера. Молчащая, она оставляет человека в настройке навсегда.
      setFailed(stepFailureKey(error));
      return;
    }

    // 🔴 ПЕРЕХОД, КОТОРЫЙ НИКУДА НЕ ВЕДЁТ, — ЭТО МОЛЧАЩАЯ КНОПКА (§Б0-септ).
    //
    // Находка владельца 15.08: мутация проходила, `onOpenCabinet()` вызывался, `/start` под
    // `ProtectedRoute` отправлял обратно в мастер — и человек оказывался на том же экране.
    // Кнопка сработала, ошибки нет, ничего не изменилось. Час на поиск того, чего не было.
    //
    // Сессию теперь выдаёт связывание, так что в норме её тут не может не быть. Но «в норме
    // не может» — это ровно та формулировка, за которой прячутся все четыре дефекта августа.
    // Проверяем факт и говорим словами, а не отправляем человека по кругу.
    if (getSessionSnapshot().status !== 'authenticated') {
      setFailed('setup.done.noSession');
      return;
    }
    onOpenCabinet();
  };

  return (
    <div className={styles.step}>
      <h2 className={styles.h}>{t('setup.done.title')}</h2>
      <p className={styles.p}>{t('setup.done.body')}</p>

      <div className={styles.card}>
        <span className={styles.cardTitle}>{t('setup.done.whatTitle')}</span>
        <ul className={styles.facts}>
          {/* Имени нет — говорим об этом, а не показываем «Вход выполнен — .» с пустотой
              на месте человека. Пустая строка в тексте выглядит как оформление; она и
              выглядела так весь вечер 15.08, пока причина была совсем в другом. */}
          <li className={teacherName === null ? styles.warn : undefined}>
            {teacherName === null
              ? t('setup.done.signedInUnknown')
              : t('setup.done.signedIn', { name: teacherName })}
          </li>
          <li>{t('setup.done.cabinetAt')}</li>
          <li>{attentionOn ? t('setup.done.consentsDoneOn') : t('setup.done.consentsDone')}</li>
          <li>
            {groupSize === null
              ? t('setup.done.checkedUnknown')
              : t('setup.done.checked', { count: groupSize })}
          </li>
        </ul>
      </div>

      <div className={styles.row}>
        {/* Причина словами — на каждом шаге, а не только на первом. */}
        {failed && (
          <p className={styles.warn} role="alert">
            {t(failed)}
          </p>
        )}

        <button type="button" className={styles.btn} onClick={() => void finish()}>
          {t('setup.done.openCabinet')}
        </button>
      </div>
      <p className={styles.note}>{t('setup.done.canClose')}</p>
    </div>
  );
}
