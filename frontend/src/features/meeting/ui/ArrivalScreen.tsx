import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { useJoinSessionMutation, useMeetingPointQuery } from '@/entities/graphql/generated';
import { ErrorState } from '@/shared/ui';

import { arrivalState, availableWithoutHost, minutesUntil } from '../arrival';

import { DeviceCheck } from './DeviceCheck';
import styles from './arrival.module.css';

/**
 * Экран прихода ученика — atlas D3 (Р5.6).
 *
 * Пять состояний листа, и одно из них главное: **«преподавателя нет в сети»**. В десктопной
 * архитектуре комната живёт на машине преподавателя, поэтому его отсутствие — штатное
 * состояние, а не поломка, и экран обязан сказать три вещи:
 *
 * 1. **«вы пришли правильно»** — снять с ребёнка подозрение, что он сломал или перепутал;
 * 2. **когда будет занятие** — расписание знает точка встречи, а не выключенный ноутбук;
 * 3. **что можно делать прямо сейчас** — а после §20.5 это почти всё: свои работы, оценки,
 *    дневник, саммари, доски своих занятий и выданные методички открываются всегда.
 *
 * Всё на этой странице отвечает **без машины преподавателя**. В этом весь смысл точки встречи.
 */
export function ArrivalScreen() {
  const { t } = useTranslation('meeting');
  const navigate = useNavigate();
  const { slug = '' } = useParams();
  const { data, loading, error, refetch } = useMeetingPointQuery({
    variables: { slug },
    skip: !slug,
    // Преподаватель откроет комнату — страница откроет её сама, без «обновите».
    pollInterval: 15_000,
  });
  const [joinSession] = useJoinSessionMutation();
  const [entering, setEntering] = useState(false);

  /**
   * 🔴 ВОЙТИ — ЗНАЧИТ ОТМЕТИТЬСЯ (найдено аудитом 17.08).
   *
   * Здесь стоял простой `navigate(...)`: ученик попадал в комнату, комната брала токен
   * через `room_token_for`, которому присутствие не нужно, и `Attendance` НЕ СОЗДАВАЛСЯ.
   * `joinSession` звали только из расписания — то есть отмечались лишь те, кто вошёл
   * из кабинета.
   *
   * В дневник ребёнка после урока уезжало «отсутствовал» — ложный факт о нём самом,
   * записанный про урок, на котором он был. И преподаватель в списке участников никогда
   * не видел «в комнате».
   *
   * ⚠️ Отказ отметки не запирает дверь: не пустить ребёнка на урок из-за неудавшейся
   * записи присутствия — хуже, чем пустая строка в журнале. Но и молчать нельзя, поэтому
   * причина остаётся в консоли, а не проглатывается.
   */
  /**
   * 🔴 ОДНО НАЖАТИЕ ЗА РАЗ (найдено аудитом 17.08).
   *
   * Кнопки «Войти» и «Войти без камеры» были живы одновременно и без обратной связи.
   * Нажали обе — побеждала та, чей `navigate()` отработает ПОСЛЕДНИМ, а порядок задаёт
   * сеть, не человек. Для продукта, чей главный принцип — приватность на устройстве, это
   * худший из возможных исходов гонки: ребёнок выбрал «без камеры» и попал с камерой.
   */
  const enterRoom = async (sessionId: string | undefined, audioOnly: boolean) => {
    if (!sessionId || entering) return;
    setEntering(true);
    try {
      await joinSession({ variables: { sessionId } });
    } catch (error) {
      // Урок важнее журнала: входим всё равно.
      console.warn('joinSession отказал, входим без отметки присутствия', error);
    }
    navigate(`/sessions/${sessionId}/room${audioOnly ? '?audio=1' : ''}`);
  };

  if (loading && !data) return <p className={styles.note}>…</p>;
  if (error || !data?.meetingPoint) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  const view = data.meetingPoint;
  const state = arrivalState(view);
  const teacher = view.teacherName;
  const next = view.nextLesson;

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <span className={styles.group}>{view.groupName}</span>
        {next && <span className={styles.lesson}>{next.title}</span>}
      </header>

      {state === 'waiting' && next && (
        <section className={styles.card}>
          <h1 className={styles.h}>
            {t('arrival.waitingTitle', { minutes: Math.max(0, minutesUntil(next.startAt)) })}
          </h1>
          <p className={styles.p}>{t('arrival.waitingBody', { teacher })}</p>
          {/* Проверка стоит здесь, а не в первую минуту занятия, когда все ждут. */}
          <DeviceCheck />
        </section>
      )}

      {state === 'live' && (
        <section className={styles.card} data-live="true">
          <h1 className={styles.h}>{t('arrival.liveTitle')}</h1>
          <p className={styles.p}>{t('arrival.liveBody', { teacher })}</p>
          <DeviceCheck />
          <div className={styles.row}>
            <button
              type="button"
              className={styles.btn}
              disabled={entering}
              onClick={() => void enterRoom(next?.sessionId, false)}
            >
              {t('arrival.enter')}
            </button>
            {/* Равноправный вариант, рядом с главной кнопкой, а не в углу: принуждение к
                камере рушит отношение надёжнее, чем отсутствие камеры рушит урок. */}
            <button
              type="button"
              className={styles.btnGhost}
              disabled={entering}
              onClick={() => void enterRoom(next?.sessionId, true)}
            >
              {t('arrival.enterAudio')}
            </button>
          </div>
          <p className={styles.note}>{t('arrival.late')}</p>
        </section>
      )}

      {/* 🔴 Главный экран листа. Не ошибка — расписание. */}
      {state === 'host_offline' && (
        <section className={styles.card} data-offline="true">
          <h1 className={styles.h}>{t('arrival.offlineTitle')}</h1>
          <p className={styles.p}>{t('arrival.offlineBody', { teacher })}</p>
          <p className={styles.kept}>{t('arrival.offlineKept')}</p>
          <Available view={view} />
        </section>
      )}

      {state === 'finished' && (
        <section className={styles.card}>
          <h1 className={styles.h}>{t('arrival.finishedTitle')}</h1>
          <p className={styles.p}>{t('arrival.finishedBody')}</p>
          <Available view={view} />
        </section>
      )}

      {state === 'link_replaced' && (
        <section className={styles.card}>
          <h1 className={styles.h}>{t('arrival.replacedTitle')}</h1>
          <p className={styles.p}>{t('arrival.replacedBody')}</p>
          <div className={styles.row}>
            <button type="button" className={styles.btn} onClick={() => navigate('/schedule')}>
              {t('arrival.replacedSchedule')}
            </button>
          </div>
          <p className={styles.note}>{t('arrival.replacedHint')}</p>
        </section>
      )}

      {state === 'not_in_group' && (
        <section className={styles.card}>
          <h1 className={styles.h}>{t('arrival.strangerTitle')}</h1>
          <p className={styles.p}>{t('arrival.strangerBody')}</p>
          <div className={styles.row}>
            {/* 🔴 Кнопка была нарисована и не делала ничего: мутации «попросить доступ» в
                продукте нет. Выключенная кнопка с честной подписью честнее живой, которая
                молча проглатывает нажатие (решение владельца, PROMPT_16 §5). */}
            <button type="button" className={styles.btnGhost} disabled title={t('arrival.notYet')}>
              {t('arrival.strangerAsk')}
            </button>
          </div>
          <p className={styles.note}>{t('arrival.strangerHow')}</p>
        </section>
      )}

      {state === 'knock' && (
        <section className={styles.card}>
          <h1 className={styles.h}>{t('arrival.knockTitle')}</h1>
          <p className={styles.p}>{t('arrival.knockBody')}</p>
          <div className={styles.row}>
            {/* Та же история: «постучаться» некуда — приёмника нет. Пока его нет, кнопка
                выключена и рядом написано, что делать вместо неё. */}
            <button type="button" className={styles.btn} disabled title={t('arrival.notYet')}>
              {t('arrival.knock')}
            </button>
          </div>
          <p className={styles.note}>{t('arrival.knockHow')}</p>
        </section>
      )}
    </div>
  );
}

/**
 * «Что доступно прямо сейчас» — из `capabilities`, а не из мнения экрана.
 *
 * Экран, решающий это сам, однажды разойдётся с тем, что действительно отвечает, и соврёт
 * ребёнку про то, зря ли он сидит перед страницей.
 */
function Available({ view }: { view: NonNullable<ReturnType<typeof useMeetingPointQuery>['data']>['meetingPoint'] }) {
  const { t } = useTranslation('meeting');
  const rows = availableWithoutHost(view);

  return (
    <div className={styles.available}>
      <span className={styles.availableTitle}>{t('available.title')}</span>
      <ul className={styles.list}>
        {rows.map((id) => (
          <li key={id} className={styles.item}>
            <b>{t(`available.${id}`)}</b>
            {id === 'homework' && (
              <>
                <small>{t('available.homeworkHint')}</small>
                {/* Решение владельца: очередь остаётся в браузере, второго приёмника нет.
                    Значит ребёнок обязан знать, где лежит его черновик, — иначе он узнает
                    это, открыв ноутбук родителей и не найдя написанного вчера. */}
                <small>{t('available.homeworkDraft')}</small>
              </>
            )}
            {id === 'myWork' && <small>{t('available.kept')}</small>}
          </li>
        ))}
      </ul>
      {/* Честная и маленькая цена, а не отсутствие доступа к своей учёбе. */}
      <div className={styles.notNow}>
        <b>{t('available.notNow')}</b>
        <small>{t('available.notNowHint')}</small>
      </div>
    </div>
  );
}
