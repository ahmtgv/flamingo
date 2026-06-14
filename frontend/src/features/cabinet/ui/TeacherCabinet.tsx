import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  FileText,
  LayoutDashboard,
  ShieldCheck,
  Video,
  XCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { MeQuery } from '@/entities/graphql/generated';

import { CabinetLayout, type CabinetNavItem } from './CabinetLayout';
import styles from './cabinet.module.css';
import { Empty } from './Empty';
import { initialsOf } from './initials';

type Me = NonNullable<MeQuery['me']>;

export function TeacherCabinet({ me }: { me: Me }) {
  const { t } = useTranslation('cabinet');
  const tp = me.teacherProfile;
  const status = tp?.verificationStatus ?? 'PENDING';

  const nav: CabinetNavItem[] = [
    { key: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard, active: true },
    { key: 'courses', label: t('nav.courses'), icon: BookOpen },
    { key: 'lessons', label: t('nav.lessons'), icon: Video },
    { key: 'grading', label: t('nav.grading'), icon: FileText },
    { key: 'analytics', label: t('nav.analytics'), icon: BarChart3 },
  ];

  const banner =
    status === 'APPROVED'
      ? { cls: styles.bannerOk, icon: <CheckCircle2 />, text: t('teacher.verify.approved') }
      : status === 'REJECTED'
        ? { cls: styles.bannerErr, icon: <XCircle />, text: t('teacher.verify.rejected') }
        : { cls: styles.bannerWarn, icon: <ShieldCheck />, text: t('teacher.verify.pending') };

  return (
    <CabinetLayout nav={nav} user={{ name: me.firstName, initials: initialsOf(me.firstName, me.lastName) }}>
      <div className={styles.content}>
        <div className={styles.pageHead}>
          <h1 className={styles.pageTitle}>{t('teacher.greeting', { name: me.firstName })}</h1>
          <p className={styles.pageSub}>
            {tp?.specialty ? t('teacher.subSpecialty', { specialty: tp.specialty }) : t('teacher.sub')}
          </p>
        </div>

        <div className={`${styles.banner} ${banner.cls}`} role="status">
          {banner.icon}
          {banner.text}
        </div>

        <div className={styles.card} style={{ marginTop: 'var(--space-4)' }}>
          <div className={styles.cardHead}>
            <span className={styles.cardHeadIcon}>
              <BookOpen />
            </span>
            <span className={styles.cardTitle}>{t('teacher.courses')}</span>
          </div>
          <Empty icon={<BookOpen size={20} />} text={t('teacher.coursesEmpty')} />
        </div>
      </div>
    </CabinetLayout>
  );
}
