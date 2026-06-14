import { ArrowLeft, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useCatalogQuery, useMeQuery, useMyCoursesQuery } from '@/entities/graphql/generated';
import { Badge, Button, Input } from '@/shared/ui';

import { CoursesLayout } from './CoursesLayout';
import styles from './courses.module.css';

export function CatalogScreen() {
  const { t } = useTranslation(['courses', 'common']);
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { data, loading } = useCatalogQuery({
    variables: { first: 50, filter: search ? { search } : null },
  });
  const { data: meData } = useMeQuery();
  const isTeacher = meData?.me?.role === 'TEACHER';
  const { data: mine } = useMyCoursesQuery({ skip: !isTeacher });
  const myCourses = mine?.myCourses ?? [];
  const nodes = data?.catalog.nodes ?? [];

  return (
    <CoursesLayout>
      <div className={styles.content}>
        <button type="button" className={styles.back} onClick={() => navigate('/app')}>
          <ArrowLeft size={15} /> {t('back')}
        </button>
        <div className={styles.pageHead}>
          <div>
            <h1 className={styles.pageTitle}>{t('catalog.title')}</h1>
            <p className={styles.pageSub}>{t('catalog.subtitle')}</p>
          </div>
          {isTeacher && (
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => navigate('/courses/new')}>
              {t('catalog.create')}
            </Button>
          )}
        </div>

        <div className={styles.toolbar}>
          <Input
            type="search"
            placeholder={t('catalog.searchPh')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={t('catalog.searchPh')}
          />
        </div>

        {isTeacher && myCourses.length > 0 && (
          <>
            <h2 className={styles.sectionTitle}>{t('catalog.mine')}</h2>
            <div className={styles.grid} style={{ marginBottom: 'var(--space-8)' }}>
              {myCourses.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={styles.courseCard}
                  onClick={() => navigate(`/courses/${c.id}`)}
                >
                  <div className={styles.courseMetaRow} style={{ marginTop: 0 }}>
                    <Badge tone="accent">{t(`level.${c.level}`)}</Badge>
                    <Badge tone={c.status === 'PUBLISHED' ? 'success' : 'neutral'}>
                      {t(`status.${c.status}`)}
                    </Badge>
                  </div>
                  <div className={styles.courseTitle}>{c.title}</div>
                  <div className={styles.courseMetaRow}>
                    <span className={styles.courseStat}>{t('catalog.lessons', { n: c.lessonCount })}</span>
                    <span className={styles.courseStat}>·</span>
                    <span className={styles.courseStat}>
                      {t('catalog.students', { n: c.enrollmentCount })}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <h2 className={styles.sectionTitle}>{t('catalog.all')}</h2>
          </>
        )}

        {nodes.length === 0 ? (
          <p className={styles.empty}>{loading ? t('common:actions.loading') : t('catalog.empty')}</p>
        ) : (
          <div className={styles.grid}>
            {nodes.map((c) => (
              <button
                key={c.id}
                type="button"
                className={styles.courseCard}
                onClick={() => navigate(`/courses/${c.id}`)}
              >
                <Badge tone="accent">{t(`level.${c.level}`)}</Badge>
                <div className={styles.courseTitle}>{c.title}</div>
                {c.description && <div className={styles.courseDesc}>{c.description}</div>}
                <div className={styles.courseTeacher}>
                  {t('detail.teacher')}: {c.owner.user.firstName} {c.owner.user.lastName}
                </div>
                <div className={styles.courseMetaRow}>
                  <span className={styles.courseStat}>{t('catalog.lessons', { n: c.lessonCount })}</span>
                  <span className={styles.courseStat}>·</span>
                  <span className={styles.courseStat}>{t('catalog.students', { n: c.enrollmentCount })}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </CoursesLayout>
  );
}
