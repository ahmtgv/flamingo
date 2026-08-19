import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import {
  type MyHomeworkQuery,
  useMyHomeworkQuery,
  useMySubmissionsQuery,
} from '@/entities/graphql/generated';
import { HOME_ROUTE } from '@/shared/lib/homeRoute';
import { Button, StateCard } from '@/shared/ui';

import { HomeworkLayout } from './HomeworkLayout';
import styles from './assignments.module.css';

type Item = MyHomeworkQuery['myHomework'][number];
type Filter = 'todo' | 'done' | 'all';

/** Сдано ли: работа с ответом ученика — уже не «сдать», даже если оценки ещё нет. */
function isHandedIn(item: Item): boolean {
  return item.viewerSubmission != null;
}

/**
 * Срок словом. Лист пишет «до чт», а не «21.08» — до четверга человек считает днями недели,
 * а дальше уже датой. Просроченное называется просроченным: тихое «до вт» в прошлом врёт.
 */
function deadline(
  iso: string | null | undefined,
  now: Date,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  if (!iso) return { text: t('due.none'), burning: false };
  const at = new Date(iso);
  /*
   * 🔴 ДНИ СЧИТАЮТСЯ КАЛЕНДАРНЫЕ, А НЕ СУТКАМИ. Деление разницы на 86 400 000 давало «до
   * сегодня» для срока, который наступает ЗАВТРА: до него оставалось 23 часа, то есть ноль
   * полных суток. Ученик читает «до сегодня» и садится делать работу на день раньше — или,
   * что хуже, видит «до сегодня» на сроке, который уже прошёл в его часовом поясе.
   */
  const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((midnight(at) - midnight(now)) / 86_400_000);
  if (days < 0) return { text: t('due.late'), burning: true };
  if (days === 0) return { text: t('due.today'), burning: true };
  if (days === 1) return { text: t('due.tomorrow'), burning: true };
  if (days < 7) return { text: t(`due.weekday.${at.getDay()}`), burning: false };
  return {
    text: t('due.date', { date: new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(at) }),
    burning: false,
  };
}

/**
 * «Задания» ученика — лист «Задания и конспект», вид «задания · ученик».
 *
 * 🔴 Экран собран на новом запросе `myHomework`. До него ученику был доступен только
 * `mySubmissions` — уже СДАННОЕ, — и главная колонка листа («Сдать») строиться было не из
 * чего: экран показывал бы только проверенное.
 *
 * Слева список того, что задано; справа рельс: ближайший срок с кнопкой сдачи и слова
 * преподавателя. Рельс отвечает на вопрос «что делать прямо сейчас», список — «что вообще
 * висит».
 */
export function StudentHomeworkScreen() {
  const { t } = useTranslation(['homework', 'common']);
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useMyHomeworkQuery();
  /*
   * 🔴 ПОПЫТКИ — ОТДЕЛЬНЫМ ЗАПРОСОМ, И ЭТО НЕ ИЗЛИШЕСТВО.
   *
   * `myHomework.viewerSubmission` отдаёт ПОСЛЕДНЮЮ попытку, а рельс листа обещает словами:
   * «все попытки сохраняются, видно и первую, и последнюю». Обещание, данное подписью и не
   * выполненное экраном, — та же ложь, что кнопка, которая ничего не делает.
   *
   * Сторож `test_orphan_count_never_grows` поймал меня здесь: переведя экран на `myHomework`,
   * я оставил `mySubmissions` без единого вызова — серверная половина без клиентской, ровно
   * то, о чём мы обычно узнаём на живом уроке.
   */
  const attempts = useMySubmissionsQuery();
  const attemptCount = new Map<string, number>();
  for (const sub of attempts.data?.mySubmissions ?? []) {
    const id = sub.homework.id;
    attemptCount.set(id, Math.max(attemptCount.get(id) ?? 0, sub.attempt));
  }
  const [filter, setFilter] = useState<Filter>('todo');
  const now = useMemo(() => new Date(), []);

  const all = data?.myHomework ?? [];
  const shown = all.filter((item) =>
    filter === 'all' ? true : filter === 'done' ? isHandedIn(item) : !isHandedIn(item),
  );
  const todo = all.filter((item) => !isHandedIn(item));
  const nearest = todo.find((item) => item.dueAt) ?? todo[0];
  /** Слова преподавателя — только там, где они есть: пустой раздел «отзывы» хуже отсутствия. */
  const words = all
    .filter((item) => item.viewerSubmission?.comment)
    .slice(0, 4);

  const head = (
    <div className={styles.head}>
      <h1 className={styles.title}>{t('my.title')}</h1>
      <span className={styles.marks}>{t('my.marksScale')}</span>
      <div className={styles.filter} role="tablist" aria-label={t('my.filterLabel')}>
        {(['todo', 'done', 'all'] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filter === key}
            className={styles.filterBtn}
            onClick={() => setFilter(key)}
          >
            {t(`my.filter.${key}`)}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <HomeworkLayout
      back={{ label: t('my.toCabinet'), to: HOME_ROUTE }}
      title={t('my.title')}
      meta={t('my.headMeta', { todo: todo.length, done: all.length - todo.length })}
    >
      <div className={styles.page}>
        <section className={styles.list} aria-label={t('my.listLabel')}>
          {head}

          {error && all.length === 0 ? (
            // ПРАВИЛА 6.4: причина, что уцелело и одно действие. «Что-то пошло не так» запрещено.
            <StateCard
              kind="failed"
              where={t('states.failedWhere')}
              title={t('states.failedTitle')}
              actions={
                <>
                  <Button variant="primary" size="sm" onClick={() => void refetch()}>
                    {t('common:actions.retry')}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => navigate('/schedule')}>
                    {t('states.failedSecond')}
                  </Button>
                </>
              }
              note={t('states.failedFoot')}
            >
              <p>{t('states.failedBody')}</p>
            </StateCard>
          ) : loading && all.length === 0 ? (
            <StateCard kind="loading" where={t('states.loadingWhere')} title={t('states.loadingTitle')}>
              <p>{t('states.loadingBody')}</p>
            </StateCard>
          ) : shown.length === 0 ? (
            <StateCard
              kind="empty"
              where={t('states.emptyWhere')}
              title={t('states.emptyTitle')}
              actions={
                <Button variant="secondary" size="sm" onClick={() => navigate('/schedule')}>
                  {t('states.emptyAction')}
                </Button>
              }
            >
              <p>{t('states.emptyBody')}</p>
            </StateCard>
          ) : (
            shown.map((item) => {
              const due = deadline(item.dueAt, now, t);
              const handed = isHandedIn(item);
              return (
                <article
                  className={styles.card}
                  key={item.id}
                  data-burning={(!handed && due.burning) || undefined}
                >
                  <p className={styles.cardKicker}>
                    <span className={styles.cardDue} data-burning={(!handed && due.burning) || undefined}>
                      {handed ? t('my.handedIn') : due.text}
                    </span>
                    {/* Курс, а не урок: у задания НА УРОК поле `course` пустое, и подпись
                        показывала название урока на месте курса. Сервер отвечает одной
                        строкой, каким бы путём задание к курсу ни привязали. */}
                    <span className={styles.cardCourse}>{item.courseTitle}</span>
                  </p>
                  <h2 className={styles.cardTitle}>{item.title}</h2>
                  {item.description && <p className={styles.cardSub}>{item.description}</p>}
                  {/* Оценка и слова преподавателя — на самой работе, а не отдельной меткой:
                      ученик читает их вместе, как и написано в листе проверки. */}
                  {item.viewerSubmission?.score != null && !item.viewerSubmission.markless && (
                    <p className={styles.cardScore}>
                      {t('my.score', { n: item.viewerSubmission.score })}
                    </p>
                  )}
                  {(attemptCount.get(item.id) ?? 0) > 1 && (
                    <p className={styles.cardAttempts}>
                      {t('my.attempts', { n: attemptCount.get(item.id) })}
                    </p>
                  )}
                  <div className={styles.cardActs}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        item.lesson?.id && navigate(`/lessons/${item.lesson.id}/homework`)
                      }
                    >
                      {handed ? t('my.open') : t('my.hand')}
                    </Button>
                    {item.description && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          item.lesson?.id && navigate(`/lessons/${item.lesson.id}/homework`)
                        }
                      >
                        {t('my.terms')}
                      </Button>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </section>

        <aside className={styles.rail} aria-label={t('my.railLabel')}>
          {nearest && (
            <section className={styles.railBlock}>
              <p className={styles.railKicker}>{t('my.nearest')}</p>
              <h2 className={styles.railTitle}>{nearest.title}</h2>
              <p className={styles.railDue}>{deadline(nearest.dueAt, now, t).text}</p>
              <Button
                variant="primary"
                block
                onClick={() =>
                  nearest.lesson?.id && navigate(`/lessons/${nearest.lesson.id}/homework`)
                }
              >
                {t('my.hand')}
              </Button>
              <p className={styles.railNote}>{t('my.handNote')}</p>
            </section>
          )}

          {words.length > 0 && (
            <section className={styles.railBlock}>
              <p className={styles.railKicker}>{t('my.words')}</p>
              {words.map((item) => (
                <div className={styles.word} key={item.id}>
                  <p className={styles.wordWho}>{item.title}</p>
                  <p className={styles.wordText}>{item.viewerSubmission?.comment}</p>
                </div>
              ))}
            </section>
          )}

          <p className={styles.railFoot}>{t('my.railFoot')}</p>
        </aside>
      </div>
    </HomeworkLayout>
  );
}
