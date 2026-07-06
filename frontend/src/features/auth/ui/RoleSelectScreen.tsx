import { ICON_LG } from '@/shared/ui/iconSizes';
import { BookOpen, Building2, GraduationCap, type LucideIcon, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import type { UiRole } from '../model/roles';
import { AuthLayout } from './AuthLayout';
import styles from './auth.module.css';

const ROLE_ICONS: Record<UiRole, LucideIcon> = {
  student: GraduationCap,
  parent: Users,
  teacher: BookOpen,
  admin: Building2,
};

const ORDER: UiRole[] = ['student', 'parent', 'teacher', 'admin'];

export function RoleSelectScreen() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();

  return (
    <AuthLayout wide>
      <div className={styles.head}>
        <span className={styles.eyebrow}>{t('roleSelect.eyebrow')}</span>
        <h1 className={styles.title}>{t('roleSelect.title')}</h1>
        <p className={styles.subtitle}>{t('roleSelect.subtitle')}</p>
      </div>

      <div className={styles.roles}>
        {ORDER.map((role) => {
          const Icon = ROLE_ICONS[role];
          return (
            <button
              key={role}
              type="button"
              className={styles.roleCard}
              onClick={() => navigate(`/register/${role}`)}
            >
              <span className={styles.roleIcon}>
                <Icon size={ICON_LG} />
              </span>
              <h3 className={styles.roleTitle}>{t(`roles.${role}.title`)}</h3>
              <p className={styles.roleDesc}>{t(`roles.${role}.desc`)}</p>
            </button>
          );
        })}
      </div>

      <p className={styles.footer}>
        {t('roleSelect.haveAccount')}{' '}
        <button type="button" className={styles.link} onClick={() => navigate('/login')}>
          {t('roleSelect.signIn')}
        </button>
      </p>
    </AuthLayout>
  );
}
