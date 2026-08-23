import { AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import {
  type CourseLevel,
  useCreateCourseMutation,
  usePublishCourseMutation,
} from '@/entities/graphql/generated';
import { useMeQuery } from '@/entities/graphql/generated';
import { HOME_ROUTE } from '@/shared/lib/homeRoute';
import { Button, Logo, StateCard, TextField } from '@/shared/ui';
import { ICON_SM } from '@/shared/ui/iconSizes';

import styles from './create.module.css';

/** Предметы листа. Первый — не «по умолчанию», а первый в алфавите замысла: без выбора курс не заводится. */
const SUBJECTS = [
  'математика',
  'физика',
  'химия',
  'биология',
  'история',
  'английский',
  'астрономия',
] as const;

/**
 * «Для кого» листа — четыре ступени вместо одиннадцати классов. Уровень в модели остаётся
 * классом, потому что на нём стоит весь каталог; ступень — способ спросить, а не второе поле.
 */
/** Длительность занятия — минуты, как их называет лист. */
const MINUTES = [30, 45, 60, 90] as const;
/** Сколько раз в неделю. Больше пяти — это уже не ритм, а ежедневность; лист столько и даёт. */
const PER_WEEK = [1, 2, 3, 5] as const;
/** Дни недели по ISO: 1 — понедельник. Порядок хранения — недельный, порядок нажатия неважен. */
const DAYS = [1, 2, 3, 4, 5, 6, 7] as const;

const BANDS: { key: string; level: CourseLevel }[] = [
  { key: 'g56', level: 'GRADE_6' },
  { key: 'g78', level: 'GRADE_8' },
  { key: 'g911', level: 'GRADE_10' },
  { key: 'adult', level: 'ADULT' },
];

/**
 * Создание курса — лист «Создание курса и занятия» (передача 21.08).
 *
 * Слева блоки настроек, справа рельс «что увидит ученик»: живое превью обложки и описи. Пока
 * человек печатает название, он видит, как курс встанет в каталог, — и это единственный
 * ответ на вопрос «что я вообще делаю», который экран может дать заранее.
 *
 * 🔴 Цены в превью нет (решение владельца §47.2). Ритм занятий лист рисует, а в модели курса
 * его негде хранить — записано вопросом в отчёте наряда 44, поле не выдумываю.
 */
export function CreateCourseScreen() {
  const { t } = useTranslation(['courses', 'common']);
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState<string | null>(null);
  const [band, setBand] = useState(BANDS[1]);
  /*
   * 🔴 РИТМ — ЗАЯВЛЕНИЕ, А НЕ РАСПИСАНИЕ (решение владельца §50).
   *
   * Здесь преподаватель говорит, что ОБЕЩАЕТ: сколько идёт занятие, сколько раз в неделю, по
   * каким дням. Ни одно занятие от этого не появляется. Экран создания занятия имеет право
   * подставить эти значения ПОДСКАЗКОЙ — и только: учитель перенесёт первый же урок, и вывод
   * одного из другого начнёт врать.
   *
   * Пустой ритм законен: курс без обещания ничем не хуже курса с обещанием.
   */
  const [minutes, setMinutes] = useState<number | null>(null);
  const [perWeek, setPerWeek] = useState<number | null>(null);
  const [days, setDays] = useState<number[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [createCourse, { loading }] = useCreateCourseMutation();
  /*
   * 🔴 ПЯТОЕ СОСТОЯНИЕ — ЧАСТИЧНЫЙ ОТКАЗ (ПРАВИЛА 6.5, долг наряда 44 §4).
   *
   * Экран собирается из ДВУХ источников: сама форма ничего не спрашивает у сервера, а рельс
   * «что увидит ученик» показывает то, что зависит от учётки — проверен ли диплом. Если не
   * пришла учётка, форма при этом полностью рабочая: курс заводится, черновик сохраняется.
   *
   * Карточка поверх всего кадра здесь соврала бы: она сказала бы «не работает ничего», когда
   * не работает одна колонка. Поэтому сломанное названо ВНУТРИ своей области — в рельсе.
   */
  const me = useMeQuery();
  const railDown = Boolean(me.error) && !me.data?.me;
  const [publishCourse, { loading: publishing }] = usePublishCourseMutation();

  async function save(publish: boolean) {
    setFormError(null);
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'courses:validation.name';
    if (!subject) errs.subject = 'courses:validation.subject';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      const { data } = await createCourse({
        variables: {
          input: {
            title,
            subject: subject as string,
            level: band.level,
            format: 'PROGRAM',
            // Необъявленное шлём как null, а не как ноль: «не сказал» и «сказал ноль» —
            // разные вещи, и ноль минут был бы обещанием, которое нельзя выполнить.
            lessonMinutes: minutes,
            lessonsPerWeek: perWeek,
            lessonDays: days.length ? days : null,
          },
        },
      });
      const id = data?.createCourse?.id;
      if (!id) return;
      // Публикация — второй шаг, а не флаг в создании: курс без единого урока в каталоге
      // никому не нужен, и лист сам предлагает «Сохранить черновиком» первым делом.
      if (publish) await publishCourse({ variables: { id } }).catch(() => undefined);
      navigate(`/courses/${id}`);
    } catch {
      setFormError(t('courses:errors.generic'));
    }
  }

  return (
    <div className={styles.shell}>
      <header className={styles.top}>
        <div className={styles.topLeft}>
          <div className={styles.crumb}>
            <button
              type="button"
              className={styles.back}
              onClick={() => navigate(HOME_ROUTE)}
              aria-label="Flamingo"
            >
              <Logo word={false} />
            </button>
            <button type="button" className={styles.back} onClick={() => navigate(HOME_ROUTE)}>
              {t('create.back')}
            </button>
            {/* Заголовок — само название: человек печатает и сразу видит, как это назовётся. */}
            <h1 className={`${styles.title} ${title ? '' : styles.titleEmpty}`}>
              {title || t('create.untitled')}
            </h1>
          </div>
          <p className={styles.state}>{t('create.stateNew')}</p>
        </div>
        {/* Лист обещает «сохраняется само». У нас курс заводится одним действием, и обещать
            автосохранение до его создания было бы неправдой — говорим, что есть. */}
        <span className={styles.saved}>{t('create.savedNote')}</span>
      </header>

      <div className={styles.page}>
        <div className={styles.blocks}>
          {formError && (
            <p className={styles.formError} role="alert">
              <AlertCircle size={ICON_SM} aria-hidden="true" /> {formError}
            </p>
          )}

          <section className={styles.block} aria-label={t('create.blockName')}>
            <span className={styles.blockHead}>{t('create.blockName')}</span>

            <div className={styles.field}>
              <TextField
                label={t('create.name')}
                requiredMark
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                error={errors.title ? t(errors.title) : undefined}
                placeholder={t('create.namePh')}
              />
              <span className={styles.hint}>{t('create.nameHint')}</span>
            </div>

            <div className={styles.field}>
              <span className={styles.label}>{t('create.subject')}</span>
              <div className={styles.chips} data-wrap-ok>
                {SUBJECTS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={styles.chip}
                    aria-pressed={subject === s}
                    onClick={() => setSubject(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <span className={styles.hint}>
                {errors.subject ? t(errors.subject) : t('create.subjectHint')}
              </span>
            </div>

            <div className={styles.field}>
              <span className={styles.label}>{t('create.band')}</span>
              <div className={styles.seg} data-wrap-ok>
                {BANDS.map((b) => (
                  <button
                    key={b.key}
                    type="button"
                    className={styles.segBtn}
                    aria-pressed={band.key === b.key}
                    onClick={() => setBand(b)}
                  >
                    {t(`create.bands.${b.key}`)}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className={styles.block} aria-label={t('create.blockRhythm')}>
            <span className={styles.blockHead}>{t('create.blockRhythm')}</span>

            <div className={styles.field}>
              <span className={styles.label}>{t('create.minutes')}</span>
              <div className={styles.seg} data-wrap-ok>
                {MINUTES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={styles.segBtn}
                    aria-pressed={minutes === m}
                    onClick={() => setMinutes(minutes === m ? null : m)}
                  >
                    {t('create.minutesValue', { n: m })}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <span className={styles.label}>{t('create.perWeek')}</span>
              <div className={styles.seg} data-wrap-ok>
                {PER_WEEK.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={styles.segBtn}
                    aria-pressed={perWeek === n}
                    onClick={() => setPerWeek(perWeek === n ? null : n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <span className={styles.label}>{t('create.days')}</span>
              <div className={styles.chips} data-wrap-ok>
                {DAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={styles.chip}
                    aria-pressed={days.includes(d)}
                    onClick={() =>
                      setDays((prev) =>
                        prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort(),
                      )
                    }
                  >
                    {t(`create.dayShort.${d}`)}
                  </button>
                ))}
              </div>
              {/* 🔴 Строка говорит ровно то, что происходит: это обещание, а не расписание.
                  Первое занятие ставит человек — иначе два источника правды разойдутся. */}
              <span className={styles.hint}>
                {days.length || minutes || perWeek
                  ? t(minutes ? 'create.rhythmSummary' : 'create.rhythmSummaryNoMinutes', {
                      days: days.length
                        ? days.map((d) => t(`create.dayShort.${d}`)).join(', ')
                        : t('create.daysNone'),
                      // §49.7: i18next склоняет только `count`; «минут» после числа
                      // обязано меняться, поэтому переменная переименована.
                      count: minutes ?? 0,
                    })
                  : t('create.rhythmEmpty')}
              </span>
            </div>
          </section>
        </div>

        <aside className={styles.rail} aria-label={t('create.railLabel')}>
          {railDown ? (
            <StateCard
              kind="partial"
              where={t('create.railFailWhere')}
              title={t('create.railFailTitle')}
              works={t('create.railFailWorks')}
              broken={t('create.railFailBroken')}
              actions={
                <Button variant="secondary" size="sm" onClick={() => void me.refetch()}>
                  {t('common:actions.retry')}
                </Button>
              }
            >
              <p>{t('create.railFailBody')}</p>
            </StateCard>
          ) : (
          <section className={styles.railCard}>
            <span className={styles.railHead}>{t('create.railLabel')}</span>
            <div className={styles.cover}>
              <span className={styles.coverTitle}>{title || t('create.untitled')}</span>
            </div>
            <dl className={styles.spec}>
              <dt>{t('create.specSubject')}</dt>
              <dd>{subject ?? '—'}</dd>
              <dt>{t('create.specBand')}</dt>
              <dd>{t(`create.bands.${band.key}`)}</dd>
              {/* Ритм в превью — только если объявлен: пустая строка «ритм —» ничего не
                  сообщает, а место занимает. */}
              {(minutes || perWeek || days.length > 0) && (
                <>
                  <dt>{t('create.specRhythm')}</dt>
                  <dd>
                    {[
                      perWeek ? t('create.perWeekValue', { count: perWeek }) : null,
                      minutes ? t('create.minutesValue', { n: minutes }) : null,
                      days.length ? days.map((d) => t(`create.dayShort.${d}`)).join(', ') : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </dd>
                </>
              )}
            </dl>
          </section>
          )}

          <section className={styles.railCard}>
            <div className={styles.actions}>
              {/* Зелёный — «решено, можно дальше» (ПРАВИЛА 5.8). Публикация и есть решение. */}
              <Button variant="primary" loading={publishing} onClick={() => void save(true)}>
                {t('create.publish')}
              </Button>
              <Button variant="secondary" loading={loading} onClick={() => void save(false)}>
                {t('create.draft')}
              </Button>
            </div>
            <p className={styles.note}>{t('create.publishNote')}</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
