import { AlertCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import {
  useCourseAudienceQuery,
  useScheduleSessionMutation,
} from '@/entities/graphql/generated';
import { HOME_ROUTE } from '@/shared/lib/homeRoute';
import { Button, Input, Logo, StateCard } from '@/shared/ui';
import { ICON_SM } from '@/shared/ui/iconSizes';

import styles from './lesson.module.css';

/** Длительность занятия — те же значения, что на курсе: это одна шкала, а не две. */
const MINUTES = [30, 45, 60, 90] as const;

/** Понедельник недели, в которой лежит день. Неделя календарная — как в кабинете. */
function mondayOf(day: Date): Date {
  const d = new Date(day);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

/**
 * 🔴 ВРЕМЯ У УЧЕНИКА — НЕ УКРАШЕНИЕ, А ЕДИНСТВЕННЫЙ СПОСОБ НЕ ПРОМАХНУТЬСЯ.
 *
 * Преподаватель ставит занятие в СВОЁМ поясе. 11:30 в Москве — это 16:30 в Шанхае, где
 * школа ещё идёт. Без этой строки о промахе узнаёшь от ученика, который не пришёл.
 *
 * `null` — пояс не назван. Тогда мы НЕ подставляем свой: подставленное время выглядит как
 * знание, которого нет.
 */
function localTime(at: Date, zone: string | null | undefined): string | null {
  if (!zone) return null;
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: zone,
    }).format(at);
  } catch {
    // Пояс из базы может оказаться неизвестным этой машине — молчать об этом нельзя,
    // но и падать незачем.
    return null;
  }
}

/** Час, в который у школьника занятие почти наверняка не получится. */
function isAwkward(time: string | null): boolean {
  if (!time) return false;
  const hour = Number(time.slice(0, 2));
  return hour < 8 || hour >= 21;
}

/**
 * Создание занятия — лист «Создание курса и занятия», вид «занятие».
 *
 * Слева «когда» и «о чём», справа «кого это касается»: записанные и их пояса, с
 * предупреждением там, где время у человека неудобное.
 *
 * ⚠️ Подсказка из ритма курса ПОКА НЕ ПОДСТАВЛЯЕТСЯ. Ритм — заявление, а не расписание
 * (§50), и подстановка обязана быть именно подсказкой с правом перебить. Записано долгом:
 * без неё экран работает, с ней — быстрее.
 */
export function ScheduleLessonScreen() {
  const { t } = useTranslation(['courses', 'common']);
  const navigate = useNavigate();
  const location = useLocation();
  const { lessonId = '', courseId = '' } = useParams();

  const audience = useCourseAudienceQuery({ variables: { courseId }, skip: !courseId });
  const [scheduleSession, { loading }] = useScheduleSessionMutation();

  const week = useMemo(() => {
    const start = mondayOf(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, []);

  /*
   * 🔴 ПО УМОЛЧАНИЮ — СЕГОДНЯ, А НЕ ПОНЕДЕЛЬНИК. Неделя календарная (как в кабинете), и её
   * начало в пятницу лежит В ПРОШЛОМ. Первый замер это и показал: занятие «ставилось» на
   * понедельник назад и не появлялось нигде — экран при этом молчал.
   *
   * Прошедшие дни недоступны вовсе: занятие в прошлое — не решение преподавателя, а промах.
   */
  const [day, setDay] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [time, setTime] = useState('11:30');
  const [minutes, setMinutes] = useState<number>(45);
  const [failed, setFailed] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  /** Момент занятия в поясе преподавателя — то, из чего считается всё остальное. */
  const startAt = useMemo(() => {
    const [h, m] = time.split(':').map(Number);
    const at = new Date(day);
    at.setHours(h || 0, m || 0, 0, 0);
    return at;
  }, [day, time]);

  const ends = new Date(startAt.getTime() + minutes * 60_000);
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  /** Время уже прошло — кнопку не даём: «поставил и не появилось» хуже отказа словами. */
  const inThePast = startAt.getTime() <= Date.now();
  const members = audience.data?.courseAudience ?? [];
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const rows = members.map((m) => {
    const local = localTime(startAt, m.timezone);
    return { ...m, local, bad: isAwkward(local) };
  });
  const awkward = rows.filter((r) => r.bad);

  async function submit() {
    setFailed(null);
    try {
      await scheduleSession({
        variables: { input: { lessonId, startAt: startAt.toISOString() } },
      });
      setDone(true);
    } catch (error) {
      // 🔴 Занятие, которое «как будто назначено», — это класс, пришедший в пустую комнату.
      setFailed(t('courses:errors.generic'));
    }
  }

  /*
   * Название урока приходит состоянием маршрута — со страницы курса, откуда сюда и нажимают.
   * Отдельного запроса за ним не заводим: он был бы вторым источником того же названия, а
   * два источника одного факта всегда однажды разойдутся.
   */
  const lessonTitle = (location.state as { title?: string } | null)?.title ?? '';

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
            <button
              type="button"
              className={styles.back}
              onClick={() => navigate(`/courses/${courseId}`)}
            >
              {t('schedule.backToCourse')}
            </button>
            <h1 className={styles.title}>{lessonTitle || t('schedule.untitled')}</h1>
          </div>
          {/* Пояс назван прямо здесь: всё время на экране — время преподавателя. */}
          <p className={styles.state}>{t('schedule.yourZone', { zone })}</p>
        </div>
      </header>

      <div className={styles.page}>
        <div className={styles.blocks}>
          {failed && (
            <p className={styles.formError} role="alert">
              <AlertCircle size={ICON_SM} aria-hidden="true" /> {failed}
            </p>
          )}

          <section className={styles.block} aria-label={t('schedule.blockWhen')}>
            <span className={styles.blockHead}>{t('schedule.blockWhen')}</span>

            <div className={styles.field}>
              <span className={styles.label}>{t('schedule.day')}</span>
              <div className={styles.days}>
                {week.map((d) => {
                  const past = d < todayStart;
                  return (
                  <button
                    key={d.toISOString()}
                    type="button"
                    className={styles.day}
                    aria-pressed={d.toDateString() === day.toDateString()}
                    disabled={past}
                    title={past ? t('schedule.dayPast') : undefined}
                    onClick={() => setDay(new Date(d))}
                  >
                    <span className={styles.dayName}>
                      {t(`create.dayShort.${((d.getDay() + 6) % 7) + 1}`)}
                    </span>
                    <span className={styles.dayNum}>{d.getDate()}</span>
                  </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.two}>
              <div className={styles.field}>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  aria-label={t('schedule.startAt')}
                />
                <span className={styles.hint}>{t('schedule.startHint')}</span>
              </div>

              <div className={styles.field}>
                <span className={styles.label}>{t('schedule.duration')}</span>
                <div className={styles.seg} data-wrap-ok>
                  {MINUTES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={styles.segBtn}
                      aria-pressed={minutes === m}
                      onClick={() => setMinutes(m)}
                    >
                      {t('create.minutesValue', { n: m })}
                    </button>
                  ))}
                </div>
                <span className={styles.hint}>
                  {t('schedule.endsAt', {
                    time: new Intl.DateTimeFormat('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(ends),
                  })}
                </span>
              </div>
            </div>
          </section>
        </div>

        <aside className={styles.rail} aria-label={t('schedule.railLabel')}>
          {audience.error ? (
            // ПРАВИЛА 6.5 — частичный отказ: список не пришёл, а занятие поставить можно.
            <StateCard
              kind="partial"
              where={t('schedule.railFailWhere')}
              title={t('schedule.railFailTitle')}
              works={t('schedule.railFailWorks')}
              broken={t('schedule.railFailBroken')}
              actions={
                <Button variant="secondary" size="sm" onClick={() => void audience.refetch()}>
                  {t('common:actions.retry')}
                </Button>
              }
            >
              <p>{t('schedule.railFailBody')}</p>
            </StateCard>
          ) : (
            <section className={styles.railCard}>
              <span className={styles.railHead}>{t('schedule.railLabel')}</span>
              <span className={styles.count}>{members.length}</span>
              <p className={styles.countNote}>{t('schedule.countNote')}</p>

              {rows.length > 0 && (
                <div className={styles.zones}>
                  <span className={styles.railHead}>{t('schedule.zonesHead')}</span>
                  {rows.map((r) => (
                    <div className={styles.zoneRow} key={r.studentId} data-bad={r.bad || undefined}>
                      <span className={styles.zoneWho}>{r.name}</span>
                      <span className={styles.zoneTime}>
                        {r.local ?? t('schedule.zoneUnknown')}
                      </span>
                    </div>
                  ))}
                  {awkward.length > 0 && (
                    <p className={styles.zoneWarn}>
                      {t('schedule.awkward', {
                        who: awkward.map((r) => r.name).join(', '),
                        time: awkward[0].local,
                      })}
                    </p>
                  )}
                </div>
              )}
            </section>
          )}

          <section className={styles.railCard}>
            <div className={styles.actions}>
              {/* Зелёный — «решено, можно дальше» (ПРАВИЛА 5.8): занятие встало в расписание. */}
              <Button
                variant="go"
                loading={loading}
                disabled={done || inThePast}
                onClick={() => void submit()}
              >
                {done ? t('schedule.doneBtn') : t('schedule.submit')}
              </Button>
              <Button variant="secondary" onClick={() => navigate(`/courses/${courseId}`)}>
                {t('schedule.cancel')}
              </Button>
            </div>
            <p className={styles.note}>
              {done
                ? t('schedule.doneNote')
                : inThePast
                  ? t('schedule.pastNote')
                  : t('schedule.submitNote', { count: members.length })}
            </p>
            {/*
              🔴 ЭТО СТОИТ ВСЕГДА, а не вместе с кнопкой. Отсутствие писем и пушей — свойство
              продукта, а не выбранного времени: первая версия прятала эту строку, когда время
              оказывалось в прошлом, и человек читал её через раз. Правда, которая мигает,
              хуже правды, которой нет: на неё перестают смотреть.
            */}
            <p className={styles.note}>{t('schedule.noMailNote')}</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
