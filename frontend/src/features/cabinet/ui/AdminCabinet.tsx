import { BarChart3, Building2, LayoutDashboard, Users, UsersRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { MeQuery } from '@/entities/graphql/generated';

import { CabinetLayout, type CabinetNavItem } from './CabinetLayout';
import styles from './cabinet.module.css';
import { Empty } from './Empty';
import { initialsOf } from './initials';

type Me = NonNullable<MeQuery['me']>;

export function AdminCabinet({ me }: { me: Me }) {
  const { t } = useTranslation('cabinet');

  const nav: CabinetNavItem[] = [
    { key: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard, active: true },
    { key: 'institution', label: t('admin.institution'), icon: Building2, to: '/admin' },
    { key: 'users', label: t('nav.users'), icon: Users, to: '/admin' },
    { key: 'groups', label: t('nav.groups'), icon: UsersRound, to: '/admin' },
    { key: 'reports', label: t('nav.reports'), icon: BarChart3 },
  ];

  return (
    <CabinetLayout nav={nav} user={{ name: me.firstName, initials: initialsOf(me.firstName, me.lastName) }}>
      <div className={styles.content}>
        <div className={styles.pageHead}>
          <h1 className={styles.pageTitle}>{t('admin.greeting', { name: me.firstName })}</h1>
          <p className={styles.pageSub}>{t('admin.sub')}</p>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardHeadIcon}>
              <Building2 />
            </span>
            <span className={styles.cardTitle}>{t('admin.institution')}</span>
          </div>
          <Empty icon={<Building2 size={20} />} text={t('admin.empty')} />
        </div>
      </div>
    </CabinetLayout>
  );
}
