import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { Logo } from '@/shared/ui';

import styles from './auth.module.css';
import { ThemeToggle } from './ThemeToggle';

/**
 * Рама входа и регистрации — лист «Вход и регистрация» (наряд 43).
 *
 * Две створки. Слева — то, ради чего человек здесь: что такое живой урок и что остаётся ему
 * навсегда. Справа — дело: форма. Прежде была одна колонка по центру, и обещание продукта на
 * экране входа не звучало вовсе: человек, пришедший с афиши, видел два поля и кнопку.
 *
 * ⚠️ Левая створка — НЕ украшение. Внизу неё стоят три строки, которые продукт обязан сказать
 * до того, как попросит почту: данные в России, записи занятий не существует, камеру
 * включает сам человек. Раньше это говорилось где угодно, только не там, где спрашивают.
 */
export function AuthLayout({
  children,
  back,
  step,
}: {
  children: ReactNode;
  /** Дорога назад — левый верхний угол правой створки, во всех состояниях (ПРАВИЛА 1.4). */
  back?: { label: string; to: string };
  /** «шаг 1 из 2», «вход» — где человек находится, машинным голосом справа. */
  step?: string;
}) {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();

  return (
    <div className={styles.shell}>
      <aside className={styles.promise}>
        <div className={styles.promiseTop}>
          <Logo />
        </div>

        <div className={styles.promiseBody}>
          <h2 className={styles.promiseTitle}>{t('promise.title')}</h2>
          <p className={styles.promiseLead}>{t('promise.lead')}</p>
          <ol className={styles.points}>
            {['1', '2', '3'].map((n, i) => (
              <li className={styles.point} key={n}>
                <span className={styles.pointNum} aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className={styles.pointText}>{t(`promise.point${n}`)}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Три обещания продукта — до того, как он просит почту, а не после. */}
        <p className={styles.promiseFoot}>{t('promise.foot')}</p>
      </aside>

      <main className={styles.pane}>
        {/* `data-wrap-ok` — отметка прибора: этот ряд ОБЯЗАН переноситься. На телефоне
            «назад», шаг и переключатель темы в одну строку не помещаются, и перенос здесь
            замысел, а не поломка. */}
        <div className={styles.paneTop} data-wrap-ok>
          {back ? (
            <button type="button" className={styles.back} onClick={() => navigate(back.to)}>
              {back.label}
            </button>
          ) : (
            <span />
          )}
          {step && <span className={styles.step}>{step}</span>}
          <ThemeToggle />
        </div>
        <div className={styles.paneBody}>{children}</div>
      </main>
    </div>
  );
}
