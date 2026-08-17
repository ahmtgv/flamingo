import { ICON_SM } from '@/shared/ui/iconSizes';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { type CourseFilter, useCatalogQuery } from '@/entities/graphql/generated';
import { Button, ErrorState, Input } from '@/shared/ui';

import { CoursesLayout } from './CoursesLayout';
import styles from './courses.module.css';
import { HOME_ROUTE } from '@/shared/lib/homeRoute';

type ChipKey = 'all' | 'math' | 'langs' | 'physics' | 'grade7' | 'oge' | 'courses' | 'cpd';

// Chips map to REAL CourseFilter fields (subject / level / search) so filtering works in both
// modes; "ОГЭ" has no exam dimension in the model, so it rides the free-text search.
const CHIPS: { key: ChipKey; filter: CourseFilter }[] = [
  { key: 'all', filter: {} },
  { key: 'math', filter: { subject: 'математика' } },
  { key: 'langs', filter: { subject: 'языки' } },
  { key: 'physics', filter: { subject: 'физика' } },
  { key: 'grade7', filter: { level: 'GRADE_7' } },
  { key: 'oge', filter: { search: 'ОГЭ' } },
  // Вторая ось аудитории (решение владельца 15.08). Без этих двух «курсы» и «повышение
  // квалификации» в каталоге неотличимы от школьной программы того же класса.
  { key: 'courses', filter: { format: 'COURSE' } },
  { key: 'cpd', filter: { format: 'PROFESSIONAL' } },
];

export function CatalogScreen() {
  const { t } = useTranslation(['courses', 'common']);
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [chip, setChip] = useState<ChipKey>('all');

  const trimmed = search.trim();
  const chipFilter = CHIPS.find((c) => c.key === chip)?.filter ?? {};
  const hasFilter = chip !== 'all' || trimmed.length > 0;
  // The user's free-text search overrides a chip's own search term (e.g. "ОГЭ").
  const filter: CourseFilter = { ...chipFilter, ...(trimmed ? { search: trimmed } : {}) };

  const { data, loading, error, refetch } = useCatalogQuery({
    variables: { first: 50, filter: hasFilter ? filter : null },
  });

  const nodes = data?.catalog.nodes ?? [];
  const totalCount = data?.catalog.totalCount ?? 0;
  const subjectCount = data?.catalog.subjectCount ?? 0;
  // Platform-zero (empty catalog, no active filter) hides the search + chips entirely; a
  // no-match under an active filter keeps them and offers a reset.
  const isZero = !loading && !error && !hasFilter && totalCount === 0;
  const isNoResults = !loading && !error && hasFilter && nodes.length === 0;

  function reset() {
    setSearch('');
    setChip('all');
  }

  return (
    <CoursesLayout>
      <div className={styles.content}>
        <button type="button" className={styles.back} onClick={() => navigate(HOME_ROUTE)}>
          <ArrowLeft size={ICON_SM} /> {t('courses:back')}
        </button>

        <div className={styles.catHead}>
          <h1 className={styles.pageTitle}>{t('catalog.title')}</h1>
          {/* Counts only once resolved — never assert "0 курсов" while the query is in flight. */}
          {!isZero && data && (
            <span className={styles.catMeta}>
              {t('catalog.coursesCount', { count: totalCount })} ·{' '}
              {t('catalog.subjectsCount', { count: subjectCount })}
            </span>
          )}
        </div>

        {!isZero && (
          <>
            <div className={styles.catSearch}>
              <Input
                type="search"
                placeholder={t('catalog.searchPh')}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  // A chip that carries its own search term (ОГЭ) can't AND with free text —
                  // release it rather than leave it pressed while its filter is overridden.
                  if (chipFilter.search && e.target.value.trim()) setChip('all');
                }}
                aria-label={t('catalog.searchAria')}
              />
            </div>
            <div className={styles.chips} role="group" aria-label={t('catalog.searchAria')}>
              {CHIPS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  className={`${styles.chip} ${chip === c.key ? styles.chipOn : ''}`}
                  aria-pressed={chip === c.key}
                  onClick={() => setChip(c.key)}
                >
                  {t(`catalog.chips.${c.key}`)}
                </button>
              ))}
            </div>
          </>
        )}

        {error && nodes.length === 0 ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : loading && nodes.length === 0 ? (
          <p className={styles.empty}>{t('common:actions.loading')}</p>
        ) : isZero ? (
          <div className={styles.catState}>
            <h2>{t('catalog.zero.title')}</h2>
            <p>{t('catalog.zero.body')}</p>
          </div>
        ) : isNoResults ? (
          <div className={styles.catState}>
            <h2>{t('catalog.noResults.title')}</h2>
            <p>{t('catalog.noResults.body', { query: trimmed || t(`catalog.chips.${chip}`) })}</p>
            <Button variant="secondary" onClick={reset}>
              {t('catalog.reset')}
            </Button>
          </div>
        ) : (
          <div className={styles.catCards}>
            {nodes.map((c) => (
              <button
                key={c.id}
                type="button"
                className={styles.courseCard}
                onClick={() => navigate(`/courses/${c.id}`)}
              >
                <div className={styles.cardSubj}>
                  {/* «Программа» на карточке — шум: школьный предмет и так выглядит предметом.
                      Вид пишем тогда, когда он что-то добавляет: курс и ДПО. */}
                  {[c.subject, t(`level.${c.level}`), c.format !== 'PROGRAM' ? t(`format.${c.format}`) : null]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
                <div className={styles.courseTitle}>{c.title}</div>
                {c.description && <div className={styles.courseDesc}>{c.description}</div>}
                <div className={styles.cardMetaRow}>
                  <span>
                    {c.owner.user.formalName}
                  </span>
                  <span>
                    {c.enrollmentCount > 0
                      ? t('catalog.cardStudents', { count: c.enrollmentCount })
                      : t('catalog.cardNew')}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </CoursesLayout>
  );
}
