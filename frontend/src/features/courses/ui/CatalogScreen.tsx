import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useSession } from '@/shared/hooks/useSession';
import { useNavigate } from 'react-router-dom';

import { type CourseFilter, useCatalogQuery } from '@/entities/graphql/generated';
import { Button, ErrorState, Input, StateCard } from '@/shared/ui';

import { Logo } from '@/shared/ui';

import styles from './catalog.module.css';
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
  // Platform-zero (empty catalog, no active filter) hides the search + chips entirely; a
  // no-match under an active filter keeps them and offers a reset.
  const isZero = !loading && !error && !hasFilter && totalCount === 0;
  const isNoResults = !loading && !error && hasFilter && nodes.length === 0;

  const isGuest = useSession().status === 'unauthenticated';
  const home = isGuest ? '/' : HOME_ROUTE;

  function reset() {
    setSearch('');
    setChip('all');
  }

  /*
   * Признаки отбора листа, разложенные по группам. Показываем только те, за которыми стоят
   * настоящие поля курса: предмет, кому, вид. «Когда занятия» и «Размер группы» лист рисует,
   * а в `Course` таких полей нет вовсе — и рисовать отбор, который ничего не отбирает, хуже,
   * чем не рисовать его: человек решит, что курсов нет.
   */
  const GROUPS: { title: string; keys: ChipKey[] }[] = [
    { title: t('catalog.groups.subject'), keys: ['math', 'langs', 'physics'] },
    { title: t('catalog.groups.who'), keys: ['grade7', 'oge'] },
    { title: t('catalog.groups.kind'), keys: ['courses', 'cpd'] },
  ];

  return (
    <div className={styles.shell}>
      <header className={styles.top}>
        <button
          type="button"
          className={styles.logoBtn}
          onClick={() => navigate('/')}
          aria-label="Flamingo"
        >
          <Logo word={false} />
        </button>
        {/* Дверь ведёт туда, откуда человек пришёл: гостя — на афишу, вошедшего — в кабинет. */}
        <button type="button" className={styles.back} onClick={() => navigate(home)}>
          {isGuest ? t('common:actions.toLanding') : t('courses:back')}
        </button>
        <span className={styles.topTitle}>{t('catalog.title')}</span>
        <span className={styles.topTag}>{t('catalog.tagline')}</span>
        <div className={styles.topActions}>
          {isGuest && (
            <>
              <Button variant="secondary" size="sm" onClick={() => navigate('/login')}>
                {t('common:actions.signIn')}
              </Button>
              <Button variant="primary" size="sm" onClick={() => navigate('/register')}>
                {t('catalog.signUp')}
              </Button>
            </>
          )}
        </div>
      </header>

      <div className={styles.page}>
        <aside className={styles.rail} aria-label={t('catalog.railLabel')}>
          <span className={styles.railHead}>{t('catalog.filterHead')}</span>
          {GROUPS.map((group) => (
            <div className={styles.group} key={group.title}>
              <p className={styles.groupTitle}>{group.title}</p>
              {/* `data-wrap-ok` — отметка прибора: этот ряд ОБЯЗАН переноситься. Рельс листа
                  так и нарисован: признаки идут по два-три в строку и переходят на следующую.
                  Без отметки прибор считает перенос дефектом — и он прав по умолчанию, потому
                  что чаще всего развалившийся ряд это поломка, а не замысел. */}
              <div className={styles.chips} data-wrap-ok>
                {group.keys.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={styles.chip}
                    aria-pressed={chip === key}
                    onClick={() => setChip(chip === key ? 'all' : key)}
                  >
                    {t(`catalog.chips.${key}`)}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <p className={styles.railFoot}>{t('catalog.timezoneNote')}</p>
        </aside>

        <section className={styles.list} aria-label={t('catalog.title')}>
          <div className={styles.listHead}>
            <div className={styles.search}>
              <Input
                type="search"
                placeholder={t('catalog.searchPh')}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  if (chipFilter.search && e.target.value.trim()) setChip('all');
                }}
                aria-label={t('catalog.searchAria')}
              />
            </div>
            {/* Счётчик только когда ответ пришёл: «0 курсов» во время запроса — это неправда. */}
            {data && !isZero && (
              <span className={styles.found}>
                {t('catalog.found', { total: totalCount, shown: nodes.length })}
              </span>
            )}
          </div>

          {error && nodes.length === 0 ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : loading && nodes.length === 0 ? (
            <p className={styles.empty}>{t('common:actions.loading')}</p>
          ) : isZero ? (
            <StateCard kind="empty" where={t('catalog.zero.where')} title={t('catalog.zero.title')}>
              <p>{t('catalog.zero.body')}</p>
            </StateCard>
          ) : isNoResults ? (
            <StateCard
              kind="empty"
              where={t('catalog.noResults.where')}
              title={t('catalog.noResults.title')}
              actions={
                <Button variant="secondary" size="sm" onClick={reset}>
                  {t('catalog.reset')}
                </Button>
              }
            >
              <p>{t('catalog.noResults.body', { query: trimmed || t(`catalog.chips.${chip}`) })}</p>
            </StateCard>
          ) : (
            <div className={styles.cards}>
              {nodes.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={styles.card}
                  onClick={() => navigate(`/courses/${c.id}`)}
                >
                  <span className={styles.cover} aria-hidden="true" />
                  <span className={styles.cardBody}>
                    <span className={styles.cardKicker}>
                      <span className={styles.cardSubj}>
                        {[c.subject, t(`level.${c.level}`)].filter(Boolean).join(' · ')}
                      </span>
                      <span className={styles.cardState}>
                        {c.enrollmentCount > 0
                          ? t('catalog.cardStudents', { count: c.enrollmentCount })
                          : t('catalog.cardNew')}
                      </span>
                    </span>
                    <span className={styles.cardTitle}>{c.title}</span>
                    <span className={styles.cardWho}>{c.owner.user.formalName}</span>
                    <span className={styles.cardFoot}>
                      <span>{t('catalog.cardLessons', { count: c.lessonCount })}</span>
                      <span className={styles.cardOpen}>{t('catalog.cardOpen')}</span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
