import { type LucideIcon, LogOut, Moon, Settings, Sun } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { toggleTheme } from '@/app/uiSlice';
import { useLogout } from '@/app/useLogout';
import { useSetAvatarMutation } from '@/entities/graphql/generated';
import { useUpload } from '@/shared/lib/useUpload';
import { Avatar, Logo } from '@/shared/ui';

import styles from './cabinet.module.css';

export interface CabinetNavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
  /** Route to navigate to; makes a non-active item a working link. */
  to?: string;
  /**
   * §59: дверь в неоформленный экран. Пункт виден и назван, но не нажимается, и здесь
   * лежит ПРИЧИНА — её человек обязан прочесть, иначе приглушение выглядит поломкой.
   */
  note?: string;
}

interface CabinetLayoutProps {
  nav: CabinetNavItem[];
  user: { name: string; initials: string; avatarUrl?: string | null };
  /** Show the avatar-upload affordance (student/teacher — roles with an avatar_key). */
  canUploadAvatar?: boolean;
  children: ReactNode;
}

export function CabinetLayout({ nav, user, canUploadAvatar, children }: CabinetLayoutProps) {
  const { t } = useTranslation(['cabinet', 'common', 'upload']);
  const theme = useAppSelector((s) => s.ui.theme);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const logout = useLogout();
  const goingDark = theme === 'light';

  const { upload } = useUpload();
  const [setAvatar] = useSetAvatarMutation();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  async function pickAvatar(file: File) {
    setUploadingAvatar(true);
    try {
      // Bytes go DIRECTLY to S3 (presigned PUT); setAvatar stores the key and returns the new
      // avatarUrl, which Apollo writes onto the normalized User → the avatar updates in place.
      const fileKey = await upload(file, 'AVATAR');
      await setAvatar({ variables: { fileKey } });
    } catch {
      // best-effort; on success the cache is the source of truth
    } finally {
      setUploadingAvatar(false);
    }
  }

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
              {!interactive && (
                <span className={styles.navSoon}>{item.note ?? t('soon')}</span>
              )}
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
            {canUploadAvatar ? (
              <label
                className={styles.avatarUpload}
                aria-label={t('upload:uploadFile')}
                aria-busy={uploadingAvatar || undefined}
              >
                <Avatar initials={user.initials} src={user.avatarUrl} size="md" />
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className={styles.fileInput}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void pickAvatar(f);
                    e.target.value = '';
                  }}
                />
              </label>
            ) : (
              <Avatar initials={user.initials} src={user.avatarUrl} size="md" />
            )}
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
