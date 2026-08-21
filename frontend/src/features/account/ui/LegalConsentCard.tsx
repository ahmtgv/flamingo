import { useTranslation } from 'react-i18next';

import { useMeQuery } from '@/entities/graphql/generated';

import styles from './account.module.css';

/**
 * Согласие 152-ФЗ на «Моём аккаунте» — СОСТОЯНИЕМ, а не флажком (решение владельца).
 *
 * 🔴 КНОПКИ ЗДЕСЬ НЕТ И НЕ ДОЛЖНО БЫТЬ. Кнопка «дать согласие» на экране аккаунта означала
 * бы, что подпись ставит тот, кто сидит за устройством, — то есть ребёнок. Согласие взрослого
 * даётся по ссылке из письма, отдельным экраном; он не собран намеренно: почта отложена, а
 * без неё это кнопка в никуда.
 *
 * ⚠️ Галочка при регистрации родительским согласием НЕ является: у подростка её ставит он
 * сам. Сервер это и различает — экран лишь показывает то, что тот ответил, и никогда не
 * додумывает «дано» из наличия галочки.
 *
 * Названы обе части — открытая и закрытая. Человек имеет право знать не только на что он
 * согласился, но и чего согласие НЕ покрывает: кадры камеры и микрофона с устройства не
 * уходят вовсе, и никакое согласие этого не меняет.
 */
export function LegalConsentCard() {
  const { t } = useTranslation('account');
  const { data, loading } = useMeQuery();
  const consent = data?.me?.consent152fz;

  const when = consent?.at
    ? new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(
        new Date(consent.at),
      )
    : null;

  /** Одна строка о том, кем и когда — или почему её нет. Догадок здесь не бывает. */
  const line = () => {
    if (loading && !consent) return t('legal.loading');
    if (!consent) return t('legal.unknown');
    if (consent.state === 'REVOKED') return t('legal.revoked', { when });
    if (consent.state === 'MISSING') return t('legal.missing');
    if (consent.isSelf) return t('legal.grantedSelf', { when });
    return consent.byWhom
      ? t('legal.grantedBy', { who: consent.byWhom, when })
      : t('legal.grantedAdult', { when });
  };

  return (
    <section className={styles.card} aria-label={t('legal.title')}>
      <h2 className={styles.cardTitle}>{t('legal.title')}</h2>
      <p className={styles.state} data-state={consent?.state?.toLowerCase()}>
        {line()}
      </p>

      {/* Открытая часть и закрытая — обе названы, и закрытая не зависит ни от какого согласия. */}
      <dl className={styles.parts}>
        <dt>{t('legal.openTitle')}</dt>
        <dd>{t('legal.openBody')}</dd>
        <dt>{t('legal.closedTitle')}</dt>
        <dd>{t('legal.closedBody')}</dd>
      </dl>

      <p className={styles.note}>{t('legal.note')}</p>
    </section>
  );
}
