import { useTranslation } from 'react-i18next';

import { useMeQuery } from '@/entities/graphql/generated';

import { AttentionConsentCard } from './AttentionConsentCard';
import styles from './account.module.css';

/**
 * «Мой кабинет» — лист D8.
 *
 * 🔴 Заведён 17.08 ради одного: ученику НЕГДЕ было дать согласие на анализ внимания, и
 * поэтому SEduM не записал ни одного числа за всю историю проекта (см. `AttentionConsentCard`).
 *
 * ⚠️ Это не весь лист D8. На нём девять разделов — профиль, вход и устройства, мои машины,
 * верификация, дети, учреждение, согласия, мои данные, уведомления. Сегодня исполнен один,
 * тот, без которого не работает главная функция продукта. Остальные — следующим заходом,
 * и делать вид, что экран готов, нельзя: он назван по листу и обязан листу соответствовать.
 */
export function AccountScreen() {
  const { t } = useTranslation('account');
  const { data } = useMeQuery();
  const name = data?.me?.displayName;

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.h1}>{t('title')}</h1>
        <p className={styles.lead}>{name ? t('leadNamed', { name }) : t('lead')}</p>
      </header>

      <AttentionConsentCard />
    </main>
  );
}
