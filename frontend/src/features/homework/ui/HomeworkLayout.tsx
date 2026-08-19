import { ICON_MD } from '@/shared/ui/iconSizes';
import { LogOut, Moon, Sun } from 'lucide-react';
import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { toggleTheme } from '@/app/uiSlice';
import { useLogout } from '@/app/useLogout';
import { Logo } from '@/shared/ui';

import styles from './homeworkLayout.module.css';
import { HOME_ROUTE } from '@/shared/lib/homeRoute';

/**
 * Шапка экранов заданий и проверки — лист «Задания и конспект».
 *
 * Одна строка: знак · дорога назад · название экрана · чем он сейчас занят · учётка. Прежде
 * шапка несла только знак и две иконки, а название экрана жило заголовком ниже — и человек,
 * попавший сюда из письма, не понимал, где он, пока не прокрутит.
 */
export function HomeworkLayout({
  children,
  back,
  title,
  meta,
}: {
  children: ReactNode;
  /** Дорога назад — левый верхний угол, во всех состояниях (ПРАВИЛА 1.4). */
  back?: { label: string; to: string };
  title?: string;
  meta?: string;
}) {
  const { t } = useTranslation(['common', 'cabinet']);
  const navigate = useNavigate();
  const theme = useAppSelector((s) => s.ui.theme);
  const dispatch = useAppDispatch();
  const logout = useLogout();
  const goingDark = theme === 'light';

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <button
          type="button"
          className={styles.logoBtn}
          onClick={() => navigate(HOME_ROUTE)}
          aria-label="Flamingo"
        >
          <Logo />
        </button>
        {back && (
          <button type="button" className={styles.back} onClick={() => navigate(back.to)}>
            {back.label}
          </button>
        )}
        {title && <span className={styles.headTitle}>{title}</span>}
        {meta && <span className={styles.headMeta}>{meta}</span>}
        <div className={styles.topActions}>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => dispatch(toggleTheme())}
            aria-label={goingDark ? t('common:theme.toDark') : t('common:theme.toLight')}
          >
            {goingDark ? <Moon size={ICON_MD} /> : <Sun size={ICON_MD} />}
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => void logout()}
            aria-label={t('cabinet:signOut')}
          >
            <LogOut size={ICON_MD} />
          </button>
        </div>
      </header>
      {children}
    </div>
  );
}
