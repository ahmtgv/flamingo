import { ICON_SM } from '@/shared/ui/iconSizes';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { type SubmissionStatus, useMySubmissionsQuery } from '@/entities/graphql/generated';
import { Badge, type BadgeTone, ErrorState } from '@/shared/ui';

import { HomeworkLayout } from './HomeworkLayout';
import styles from './homework.module.css';

const STATUS_TONE: Record<SubmissionStatus, BadgeTone> = {
  SUBMITTED: 'info',
  LATE: 'warning',
  GRADED: 'success',
};

export function StudentHomeworkScreen() {
  const { t } = useTranslation(['homework', 'common']);
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useMySubmissionsQuery();

  const submissions = data?.mySubmissions ?? [];

  return (
    <HomeworkLayout>
      <div className={styles.content}>
        <button type="button" className={styles.back} onClick={() => navigate('/app')}>
          <ArrowLeft size={ICON_SM} /> {t('back')}
        </button>
        <h1 className={styles.pageTitle}>{t('my.title')}</h1>
        <p className={styles.pageSub}>{t('my.subtitle')}</p>

        {error && submissions.length === 0 ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : submissions.length === 0 ? (
          <p className={styles.empty}>{loading ? t('common:actions.loading') : t('my.empty')}</p>
        ) : (
          submissions.map((s) => (
            <div className={styles.card} key={s.id}>
              <div className={styles.cardHead}>
                <span className={styles.cardTitle}>{s.homework.title}</span>
                <Badge tone={STATUS_TONE[s.status]}>{t(`status.${s.status}`)}</Badge>
                {s.score != null && <Badge tone="neutral">{t('my.score', { n: s.score })}</Badge>}
              </div>
              {s.comment && <p className={styles.submissionBody}>{s.comment}</p>}
            </div>
          ))
        )}
      </div>
    </HomeworkLayout>
  );
}
