import { type LucideIcon, LogOut, Moon, Settings, Sun } from 'lucide-react';
import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { toggleTheme } from '@/app/uiSlice';
import { useLogout } from '@/app/useLogout';
import { Avatar, Logo } from '@/shared/ui';

import styles from './cabinet.module.css';

export interface CabinetNavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
  /** Route to navigate to; makes a non-active item a working link. */
  to?: string;
}

interface CabinetLayoutProps {
  nav: CabinetNavItem[];
  user: { name: string; initials: string };
  children: ReactNode;
}

export function CabinetLayout({ nav, user, children }: CabinetLayoutProps) {
  const { t } = useTranslation(['cabinet', 'common']);
  const theme = useAppSelector((s) => s.ui.theme);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const logout = useLogout();
  const goingDark = theme === 'light';

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.sideLogo}>
          <Logo />
        </div>
        {nav.map((item) => {
          const Icon = item.icon;
          const interactive = item.active || !!item.to;
          return (
            <button
              key={item.key}
              type="button"
              className={[styles.navItem, item.active ? styles.navActive : ''].filter(Boolean).join(' ')}
              disabled={!interactive}
              aria-current={item.active ? 'page' : undefined}
              onClick={item.to ? () => navigate(item.to as string) : undefined}
            >
              <Icon />
              {item.label}
              {!interactive && <span className={styles.navSoon}>{t('soon')}</span>}
            </button>
          );
        })}
        <div className={styles.navSep} />
        <button type="button" className={styles.navItem} disabled>
          <Settings />
          {t('nav.settings')}
          <span className={styles.navSoon}>{t('soon')}</span>
        </button>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.topActions}>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => dispatch(toggleTheme())}
              aria-label={goingDark ? t('common:theme.toDark') : t('common:theme.toLight')}
            >
              {goingDark ? <Moon /> : <Sun />}
            </button>
            <span className={styles.userName}>{user.name}</span>
            <Avatar initials={user.initials} size="md" />
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => void logout()}
              aria-label={t('signOut')}
            >
              <LogOut />
            </button>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
