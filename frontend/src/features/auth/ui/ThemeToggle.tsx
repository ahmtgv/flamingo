import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { toggleTheme } from '@/app/uiSlice';

import styles from './auth.module.css';

export function ThemeToggle() {
  const { t } = useTranslation('common');
  const theme = useAppSelector((s) => s.ui.theme);
  const dispatch = useAppDispatch();
  const goingDark = theme === 'light';

  return (
    <button
      type="button"
      className={styles.themeToggle}
      onClick={() => dispatch(toggleTheme())}
      aria-label={goingDark ? t('theme.toDark') : t('theme.toLight')}
    >
      {goingDark ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}
