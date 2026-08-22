import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import {
  useApproveEnrollmentMutation,
  useCourseAudienceQuery,
  useCourseInviteQuery,
  useDeclineEnrollmentMutation,
  useRedeemCourseInviteMutation,
  useRevokeCourseInviteMutation,
} from '@/entities/graphql/generated';
import { HOME_ROUTE } from '@/shared/lib/homeRoute';
import { serverMessage } from '@/shared/lib/requestFailure';
import { Button, Input, Logo, StateCard } from '@/shared/ui';

import styles from './invite.module.css';

/**
 * Приглашение в курс — лист «Приложение и надзор», вид «приглашение».
 *
 * 🔴 БЕЗ ЭТОГО ЭКРАНА ПУТЬ НЕ ПРОХОДИТСЯ (решение владельца §53): код и ответ «кто ты» в
 * продукте были, а действия «войти по коду» не было вовсе — позвать постороннего нечем.
 *
 * Две половины рядом, как на листе: слева преподаватель отдаёт доступ, справа человек
 * входит. Это один разговор двух людей; развести их по экранам значит объяснить каждому
 * половину.
 *
 * ⚠️ Лист говорит «код группы», у нас — код КУРСА: у преподавателя, который завёл курс сам,
 * группы нет вовсе, а именно он и зовёт первого ученика. Точка встречи группы остаётся для
 * учреждений. Записано в отчёте.
 */
export function InviteScreen() {
  const { t } = useTranslation(['courses', 'common']);
  const navigate = useNavigate();
  const { courseId = '' } = useParams();

  const invite = useCourseInviteQuery({ variables: { courseId }, skip: !courseId });
  const audience = useCourseAudienceQuery({ variables: { courseId }, skip: !courseId });
  const [revoke, { loading: revoking }] = useRevokeCourseInviteMutation();
  const [approve] = useApproveEnrollmentMutation();
  const [decline] = useDeclineEnrollmentMutation();

  const [copied, setCopied] = useState(false);
  // Какую строку сейчас решают: нажатая кнопка должна отвечать сама за себя, а не гасить
  // весь список — иначе преподаватель не знает, что именно происходит.
  const [acting, setActing] = useState<string | null>(null);

  async function decide(enrollmentId: string, yes: boolean) {
    setActing(enrollmentId);
    try {
      if (yes) await approve({ variables: { id: enrollmentId } });
      else await decline({ variables: { id: enrollmentId } });
      await audience.refetch();
    } catch {
      // Отказ сервера виден по тому, что строка осталась на месте: список перечитывается
      // с сервера, а не правится на месте по вере в успех.
      await audience.refetch();
    } finally {
      setActing(null);
    }
  }
  const code = invite.data?.courseInvite.code ?? '';
  /** Ссылку собирает клиент: домен в коде сервера не зашивается. */
  const link = code ? `${window.location.origin}/join/${code}` : '';

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      // Буфер может быть закрыт правами страницы. Молчать нельзя: человек нажал и ждёт.
      setCopied(false);
    }
  }

  return (
    <div className={styles.shell}>
      <header className={styles.top}>
        <button
          type="button"
          className={styles.logoBtn}
          onClick={() => navigate(HOME_ROUTE)}
          aria-label="Flamingo"
        >
          <Logo word={false} />
        </button>
        <button type="button" className={styles.back} onClick={() => navigate(`/courses/${courseId}`)}>
          {t('invite.backToCourse')}
        </button>
        <span className={styles.topTitle}>{t('invite.top')}</span>
      </header>

      <div className={styles.page}>
        <section className={styles.half} aria-label={t('invite.teacherSide')}>
          <span className={styles.kicker}>{t('invite.teacherSide')}</span>
          <h1 className={styles.title}>{t('invite.teacherTitle')}</h1>

          {invite.error ? (
            <StateCard
              kind="failed"
              where={t('invite.codeFailWhere')}
              title={t('invite.codeFailTitle')}
              actions={
                <Button variant="secondary" size="sm" onClick={() => void invite.refetch()}>
                  {t('common:actions.retry')}
                </Button>
              }
            >
              <p>{t('invite.codeFailBody')}</p>
            </StateCard>
          ) : (
            <div className={styles.codeCard}>
              <span className={styles.codeMeta}>
                {t('invite.codeMeta', { days: invite.data?.courseInvite.daysLeft ?? 0 })}
              </span>
              <span className={styles.code}>{code || '···'}</span>
              <div className={styles.codeActs}>
                <Button variant="primary" size="sm" disabled={!link} onClick={() => void copy()}>
                  {copied ? t('invite.copied') : t('invite.copy')}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={revoking}
                  onClick={async () => {
                    await revoke({ variables: { courseId } }).catch(() => undefined);
                    setCopied(false);
                    await invite.refetch();
                  }}
                >
                  {t('invite.replace')}
                </Button>
              </div>
            </div>
          )}

          <span className={styles.kicker}>{t('invite.whoCame')}</span>
          {audience.error ? (
            /* Пятое состояние: код показать можно, список — нет. Сломанное названо внутри
               своей половины, а не карточкой поверх всего экрана. */
            <StateCard
              kind="partial"
              where={t('invite.whoFailWhere')}
              title={t('invite.whoFailTitle')}
              works={t('invite.whoFailWorks')}
              broken={t('invite.whoFailBroken')}
              actions={
                <Button variant="secondary" size="sm" onClick={() => void audience.refetch()}>
                  {t('common:actions.retry')}
                </Button>
              }
            >
              <p>{t('invite.whoFailBody')}</p>
            </StateCard>
          ) : (audience.data?.courseAudience.length ?? 0) === 0 ? (
            <p className={styles.empty}>{t('invite.whoEmpty')}</p>
          ) : (
            <div className={styles.who}>
              {audience.data?.courseAudience.map((m) => (
                <div className={styles.whoRow} key={m.studentId} data-state={m.status}>
                  <span className={styles.whoName}>{m.name}</span>
                  {/* 🔴 Строка говорит, ЧЕГО ждут. «Ждёт» без причины — это не состояние, а
                      многоточие: преподаватель считает человека пришедшим, а тот на занятие
                      не попадёт. */}
                  <span className={styles.whoState} data-waiting={m.status !== 'ACTIVE' || undefined}>
                    {t(`invite.state.${m.status}`)}
                  </span>
                  <span className={styles.whoHow}>
                    {m.status === 'PENDING_CONSENT'
                      ? t('invite.consentNoMail')
                      : m.timezone
                        ? t('invite.zone', { zone: m.timezone })
                        : t('invite.zoneUnknown')}
                  </span>
                  {m.status === 'PENDING_TEACHER' && (
                    <span className={styles.whoActs}>
                      <Button
                        variant="primary"
                        size="sm"
                        loading={acting === m.enrollmentId}
                        onClick={() => void decide(m.enrollmentId, true)}
                      >
                        {t('invite.accept')}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void decide(m.enrollmentId, false)}
                      >
                        {t('invite.decline')}
                      </Button>
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <p className={styles.note}>{t('invite.teacherNote')}</p>
        </section>

        <JoinHalf />
      </div>
    </div>
  );
}

/**
 * Половина входящего. Живёт и отдельным экраном по адресу `/join/:code` — человек приходит
 * по ссылке, а не смотрит на неё через плечо преподавателя.
 */
export function JoinHalf({ presetCode }: { presetCode?: string } = {}) {
  const { t } = useTranslation(['courses', 'common']);
  const navigate = useNavigate();
  const [code, setCode] = useState(presetCode ?? '');
  const [failed, setFailed] = useState<string | null>(null);
  // Не «вошёл ли», а ЧТО ПОЛУЧИЛОСЬ: код принят, но ученику младше 16 курс откроется
  // только после согласия представителя (§51), и сказать ему «вы на курсе» — соврать.
  const [joined, setJoined] = useState<{ title: string; status: string } | null>(null);
  const [redeem, { loading }] = useRedeemCourseInviteMutation();

  async function submit() {
    setFailed(null);
    try {
      const { data } = await redeem({ variables: { code: code.trim() } });
      const result = data?.redeemCourseInvite;
      setJoined({
        title: result?.course.title ?? '',
        status: result?.status ?? 'ACTIVE',
      });
    } catch (error) {
      /*
       * 🔴 Слово сервера, а не своё. Он различает три отказа — «срок вышел», «код закрыт»,
       * «такого кода нет», — и каждый лечится по-своему. Подменив их своим «не получилось»,
       * экран отправил бы человека искать опечатку, которой он не делал.
       */
      setFailed(serverMessage(error) ?? t('courses:invite.joinFailUnknown'));
    }
  }

  return (
    <section className={styles.half} aria-label={t('invite.pupilSide')}>
      <span className={styles.kicker}>{t('invite.pupilSide')}</span>
      <h2 className={styles.title}>{t('invite.pupilTitle')}</h2>
      <p className={styles.lead}>{t('invite.pupilLead')}</p>

      {joined !== null ? (
        <>
          <p className={styles.okLine} data-waiting={joined.status !== 'ACTIVE' || undefined}>
            {t(`invite.joinedAs.${joined.status}`, { title: joined.title })}
          </p>
          {joined.status === 'PENDING_CONSENT' && (
            <p className={styles.note}>{t('invite.consentNoMailPupil')}</p>
          )}
          <Button variant="go" onClick={() => navigate(HOME_ROUTE)}>
            {t('invite.toCabinet')}
          </Button>
        </>
      ) : (
        <div className={styles.form}>
          {failed && (
            <p className={styles.formError} role="alert">
              {failed}
            </p>
          )}
          <div className={styles.codeInput}>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="FLM-0000"
              aria-label={t('invite.codeLabel')}
            />
          </div>
          <Button variant="primary" loading={loading} disabled={!code.trim()} onClick={() => void submit()}>
            {t('invite.join')}
          </Button>
          <p className={styles.note}>{t('invite.pupilNote')}</p>
        </div>
      )}
    </section>
  );
}
