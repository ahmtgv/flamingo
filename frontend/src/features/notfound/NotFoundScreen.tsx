import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { HOME_ROUTE } from '@/shared/lib/homeRoute';
import { Button } from '@/shared/ui';

import styles from './notfound.module.css';

/**
 * «ТАКОЙ СТРАНИЦЫ НЕТ» — вместо молчаливой переадресации (находка ревьюера Р-5, 18.08).
 *
 * 🔴 ЧТО БЫЛО. `path="*"` уводил на корень без единого слова. Ревьюер набрал `/mylearning`
 * вместо `/my-learning` — и оказался на стартовой, не узнав, что промахнулся. Человек с
 * опечаткой в ссылке решит, что «ссылка не работает», и напишет об этом нам; на самом деле
 * не работала опечатка.
 *
 * ⚠️ Адрес показан ЦЕЛИКОМ и намеренно: это единственное, что помогает понять, где ошибка —
 * своя опечатка, устаревшая ссылка из письма или чужая ссылка не на тот продукт.
 */
export function NotFoundScreen() {
  const { t } = useTranslation(['common']);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <div className={styles.page}>
      <p className={styles.kicker}>{t('common:notFound.kicker')}</p>
      <h1 className={styles.title}>{t('common:notFound.title')}</h1>
      <p className={styles.what}>
        {t('common:notFound.what')} <code className={styles.path}>{pathname}</code>
      </p>
      <p className={styles.why}>{t('common:notFound.why')}</p>
      <div className={styles.acts}>
        <Button variant="primary" onClick={() => navigate(HOME_ROUTE)}>
          {t('common:actions.toCabinet')}
        </Button>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          {t('common:notFound.back')}
        </Button>
      </div>
    </div>
  );
}
