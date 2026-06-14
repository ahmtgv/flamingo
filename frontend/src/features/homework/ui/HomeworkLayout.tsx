import { LogOut, Moon, Sun } from 'lucide-react';
import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { toggleTheme } from '@/app/uiSlice';
import { useLogout } from '@/app/useLogout';
import { Logo } from '@/shared/ui';

import styles from './homework.module.css';

export function HomeworkLayout({ children }: { children: ReactNode }) {
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
          onClick={() => navigate('/app')}
          aria-label="Flamingo"
        >
          <Logo />
        </button>
        <div className={styles.topActions}>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => dispatch(toggleTheme())}
            aria-label={goingDark ? t('common:theme.toDark') : t('common:theme.toLight')}
          >
            {goingDark ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => void logout()}
            aria-label={t('cabinet:signOut')}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>
      {children}
    </div>
  );
}
