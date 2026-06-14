import { BarChart3, BookOpen, Calendar, FileText, LayoutDashboard, ShieldCheck, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { MeQuery } from '@/entities/graphql/generated';

import { CabinetLayout, type CabinetNavItem } from './CabinetLayout';
import styles from './cabinet.module.css';
import { Empty } from './Empty';
import { initialsOf } from './initials';

type Me = NonNullable<MeQuery['me']>;

export function StudentCabinet({ me }: { me: Me }) {
  const { t } = useTranslation('cabinet');
  const sp = me.studentProfile;
  const isJunior = sp?.ageBand === 'JUNIOR';

  const nav: CabinetNavItem[] = [
    { key: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard, active: true },
    { key: 'schedule', label: t('nav.schedule'), icon: Calendar },
    { key: 'courses', label: t('nav.courses'), icon: BookOpen, to: '/courses' },
    { key: 'homework', label: t('nav.homework'), icon: FileText },
    { key: 'analytics', label: t('nav.analytics'), icon: BarChart3 },
  ];

  return (
    <CabinetLayout nav={nav} user={{ name: me.firstName, initials: initialsOf(me.firstName, me.lastName) }}>
      <div className={styles.content}>
        <div className={styles.pageHead}>
          <h1 className={styles.pageTitle}>
            {isJunior ? t('student.greetingKid', { name: me.firstName }) : t('student.greeting', { name: me.firstName })}
          </h1>
          <p className={styles.pageSub}>{sp?.gradeLevel || t('student.sub')}</p>
        </div>

        <div className={styles.grid}>
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.cardHeadIcon}>
                <Sparkles />
              </span>
              <span className={styles.cardTitle}>{t('student.points')}</span>
            </div>
            <div className={styles.statNum}>{sp?.points ?? 0}</div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.cardHeadIcon}>
                <Calendar />
              </span>
              <span className={styles.cardTitle}>{t('student.today')}</span>
            </div>
            <Empty icon={<Calendar size={20} />} text={t('student.todayEmpty')} />
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardHeadIcon}>
              <BookOpen />
            </span>
            <span className={styles.cardTitle}>{t('student.courses')}</span>
          </div>
          <Empty icon={<BookOpen size={20} />} text={t('student.coursesEmpty')} />
        </div>

        <div className={`${styles.card} ${styles.privacy}`}>
          <ShieldCheck />
          {t('privacyNote')}
        </div>
      </div>
    </CabinetLayout>
  );
}
