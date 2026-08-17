import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import {
  type MeetingAccessMode,
  useGroupMeetingPointQuery,
  useMeetingParticipantsQuery,
  useReplaceMeetingLinkMutation,
  useSetMeetingAccessMutation,
  useStartSessionMutation,
} from '@/entities/graphql/generated';
import { failureText } from '@/shared/lib/requestFailure';
import { ErrorState } from '@/shared/ui';

import { hasCanonicalOrigin, joinUrl, MEETING_MODES, whenOpened } from '../invite';

import styles from './invite.module.css';

/**
 * Панель преподавателя — atlas D3, левая половина листа (Р5.6-Б).
 *
 * Последний кусок главного пути: отсюда группа получает дверь, а преподаватель — «Начать урок».
 *
 * Две вещи листа, которые легко потерять при реализации и которые здесь держатся намеренно:
 *
 * * **Ссылка одна и постоянная, у ГРУППЫ, а не у занятия.** Разовая ссылка на каждый урок
 *   звучит безопаснее, а на практике это еженедельная рассылка, которую половина класса
 *   потеряет. Поэтому здесь нет и не будет кнопки «выдать ссылку на это занятие».
 * * **Ученику группы ссылка не нужна вовсе** — занятие появляется у него в расписании само.
 *   Ссылка нужна новичку, пробному уроку и тому, кто всё потерял; про это сказано на экране,
 *   чтобы преподаватель не рассылал её каждый четверг «на всякий случай».
 *
 * Приглашение — **две дороги и только две**: ссылка и шестизначный код. QR убран решением
 * владельца 14.08 и по хорошей причине: компьютер QR не читает, он его только показывает, а
 * читать нужно устройством с камерой в руке. Обе оставшиеся дороги короче.
 */
export function InvitePanel({ groupId }: { groupId: string }) {
  const { t } = useTranslation('meeting');
  const { data, loading, error, refetch } = useGroupMeetingPointQuery({ variables: { groupId } });
  const { data: people } = useMeetingParticipantsQuery({
    variables: { groupId },
    pollInterval: 20_000,
  });
  const [setAccess] = useSetMeetingAccessMutation();
  const [replaceLink, { loading: replacing }] = useReplaceMeetingLinkMutation();
  const [startSession, { loading: starting }] = useStartSessionMutation();
  const navigate = useNavigate();

  const [copied, setCopied] = useState(false);
  const [startFailed, setStartFailed] = useState<string | null>(null);

  if (loading && !data) return <p className={styles.note}>…</p>;
  if (error || !data?.groupMeetingPoint) return <ErrorState onRetry={() => void refetch()} />;

  const point = data.groupMeetingPoint;
  const next = point.nextLesson;
  const url = joinUrl(point.slug);

  /**
   * Начать занятие и открыть комнату — то, что обещает подпись.
   *
   * ⚠️ Идущее занятие НЕ начинаем повторно: `startSession` у идущего сработал бы вхолостую,
   * а преподаватель, вернувшийся в комнату посреди урока, не должен ничего «начинать».
   */
  const begin = async () => {
    if (!next) return;
    setStartFailed(null);
    try {
      if (!next.isLive) await startSession({ variables: { sessionId: next.sessionId } });
      navigate(`/sessions/${next.sessionId}/room`);
    } catch (err) {
      // Молчащая кнопка на этом месте оставила бы класс ждать, а преподавателя — гадать.
      setStartFailed(failureText(err));
    }
  };
  const participants = people?.meetingParticipants ?? [];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Буфер может быть закрыт политикой браузера. Ссылка на экране целиком — её видно и
      // можно выделить руками; молча притворяться, что скопировали, нельзя.
      setCopied(false);
    }
  };

  return (
    <div className={styles.panel}>
      <header>
        <h1 className={styles.h}>{t('invite.title')}</h1>
        <p className={styles.p}>{t('invite.body')}</p>
      </header>

      <section className={styles.card}>
        <div className={styles.linkHead}>
          <span className={styles.label}>{t('invite.link')}</span>
          <span className={styles.tagOk}>{t('invite.active')}</span>
        </div>
        <div className={styles.linkRow}>
          <code className={styles.url}>{url}</code>
          <button type="button" className={styles.mini} onClick={() => void copy()}>
            {copied ? t('invite.copied') : t('invite.copy')}
          </button>
        </div>

        {/* Код — для голоса: продиктовать по телефону, написать на доске, сказать родителю.
            Тот же приём, что при связывании машины в D2 — механизм, который человек уже видел. */}
        {/* Ссылка собирается только с канонического адреса. Если его нет — говорим об этом
            здесь, а не даём преподавателю разослать классу localhost. */}
        {!hasCanonicalOrigin() && <p className={styles.warn}>{t('invite.originMissing')}</p>}

        <output className={styles.code}>{formatCode(point.code)}</output>
        <p className={styles.note}>{t('invite.codeHint')}</p>

        <div className={styles.actions}>
          <button type="button" className={styles.mini} disabled title={t('invite.soon')}>
            {t('invite.toChat')}
          </button>
          <button type="button" className={styles.mini} disabled title={t('invite.soon')}>
            {t('invite.toParents')}
          </button>
          <button
            type="button"
            className={styles.mini}
            disabled={replacing}
            onClick={() => void replaceLink({ variables: { groupId } }).then(() => refetch())}
          >
            {t('invite.replace')}
          </button>
        </div>
        <p className={styles.note}>{t('invite.replaceHint')}</p>
      </section>

      <section className={styles.card}>
        <span className={styles.label}>{t('invite.whoCanJoin')}</span>
        {/* 🔴 По умолчанию «только ученики этой группы» (решение владельца 14.08, п.1). */}
        {MEETING_MODES.map((mode) => (
          <label key={mode} className={styles.mode}>
            <input
              type="radio"
              name="accessMode"
              checked={point.accessMode === mode}
              onChange={() =>
                void setAccess({ variables: { groupId, mode: mode as MeetingAccessMode } }).then(
                  () => refetch(),
                )
              }
            />
            <span>
              <b>{t(`invite.modes.${mode}`)}</b>
              <small>{t(`invite.modes.${mode}_HINT`)}</small>
            </span>
          </label>
        ))}
      </section>

      <section className={styles.card}>
        <span className={styles.label}>
          {t('invite.participants', { count: participants.length })}
        </span>
        <ul className={styles.people}>
          {participants.map((person) => (
            <li key={person.studentId} className={styles.person} data-state={person.state}>
              <span className={styles.avatar} aria-hidden="true">
                {initials(person.name)}
              </span>
              <span className={styles.who}>
                <b>{person.name}</b>
                <small>
                  {person.since ? whenOpened(person.since) : t('invite.sinceNever')}
                </small>
              </span>
              <span className={styles.state}>{t(`invite.state.${person.state}`)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.card}>
        {/* Что видят ученики прямо сейчас — чтобы преподаватель не гадал. */}
        <span className={styles.label}>{t('invite.pupilsSeeTitle')}</span>
        <p className={styles.note}>{t('invite.pupilsSee')}</p>
        <div className={styles.actions}>
          {/* 🔴 КНОПКА ОБЯЗАНА ДЕЛАТЬ ТО, ЧТО НА НЕЙ НАПИСАНО (решение владельца §27.4).
              «Начать урок» вело в РАСПИСАНИЕ, хотя текст рядом на этом же экране обещает
              обратное: «Пока вы не нажали „Начать урок", у них экран ожидания». Ученики
              ждали, преподаватель нажимал — и попадал в список занятий.
              Причина была не в кнопке: экран не знал, какое занятие начинать. Теперь знает —
              `groupMeetingPoint.nextLesson`, то самое, что видит ученик по ссылке. */}
          <button
            type="button"
            className={styles.btn}
            onClick={() => void begin()}
            disabled={!next || starting}
            title={next ? undefined : t('invite.startNothing')}
          >
            {t('invite.start')}
          </button>
          <a
            className={styles.mini}
            href={`/j/${point.slug}`}
            target="_blank"
            rel="noreferrer noopener"
          >
            {t('invite.seeAsPupil')}
          </a>
        </div>
        {startFailed && (
          <p className={styles.note} role="alert">
            {t(startFailed)}
          </p>
        )}
        {!next && <p className={styles.note}>{t('invite.startNothing')}</p>}
      </section>
    </div>
  );
}

function formatCode(code: string): string {
  const clean = (code || '').toUpperCase();
  return clean.length === 6 ? `${clean.slice(0, 3)} · ${clean.slice(3)}` : clean;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}
