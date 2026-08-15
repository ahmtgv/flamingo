import { ICON_SM } from '@/shared/ui/iconSizes';
import { ArrowLeft, FileText } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import {
  type VerificationQueueQuery,
  useOversightLogQuery,
  useRejectTeacherMutation,
  useRequestVerificationDocumentsMutation,
  useVerificationQueueQuery,
  useVerifyTeacherMutation,
  VerificationDocumentUrlDocument,
} from '@/entities/graphql/generated';
import { apolloClient } from '@/app/apolloClient';
import { formatBytes } from '@/shared/lib/uploadLimits';
import { Button, ErrorState, Input } from '@/shared/ui';

import { AdminLayout } from './AdminLayout';
import styles from './admin.module.css';

type Entry = VerificationQueueQuery['verificationQueue'][number];

const DAY_MS = 86_400_000;
const DATE = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
const STAMP = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * Верификация преподавателей — лист атласа D7, раздел «Надзор · верификация».
 *
 * 🔴 Находка владельца 15.08, п.4: «баннер "Документы на проверке" висит, а экрана
 * подтверждения нет ни у кого». Путь обрывался ровно здесь: преподаватель мог отправить
 * документ, и дальше он не существовал ни для кого.
 *
 * Три решения листа, которые легко потерять при реализации:
 *
 * * **Решение принимается о ЧЕЛОВЕКЕ, а не о файле.** Кнопки стоят под карточкой человека:
 *   три бумаги одного преподавателя — одно дело, и «диплом принят, справка отклонена» не
 *   значит ничего.
 * * **Отказ обязан нести причину** и уходит человеку текстом, а не молчанием. Поле причины
 *   открывается до отправки, и сервер тоже не примет пустое — правило одно на обе стороны.
 * * **Каждый просмотр документа пишется в журнал.** Диплом и справка — чужое личное; журнал
 *   тут же на экране, потому что панель надзирает и за надзирающим (§23.3.5).
 *
 * Состав документов (диплом, справка, паспорт) — вопрос к юристам и юрисдикционной матрице,
 * а не к экрану: лист рисует механизм.
 */
export function VerificationScreen() {
  const { t } = useTranslation(['admin', 'common']);
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useVerificationQueueQuery();
  const { data: logData, refetch: refetchLog } = useOversightLogQuery({ variables: { limit: 30 } });

  const queue = data?.verificationQueue ?? [];
  const log = logData?.oversightLog ?? [];

  const reload = async () => {
    await Promise.all([refetch(), refetchLog()]);
  };

  return (
    <AdminLayout>
      <div className={styles.content}>
        <button type="button" className={styles.back} onClick={() => navigate('/admin')}>
          <ArrowLeft size={ICON_SM} /> {t('back')}
        </button>
        <h1 className={styles.pageTitle}>{t('verification.title')}</h1>
        <p className={styles.pageSub}>{t('verification.sub')}</p>

        {error ? (
          // Отказ в правах — не поломка связи, и предлагать «повторить» тут нечестно.
          error.graphQLErrors.length > 0 ? (
            <p className={styles.empty}>{t('verification.forbidden')}</p>
          ) : (
            <ErrorState text={t('verification.error')} onRetry={() => void refetch()} />
          )
        ) : loading && queue.length === 0 ? (
          <p className={styles.muted}>{t('common:actions.loading')}</p>
        ) : queue.length === 0 ? (
          <p className={styles.empty}>{t('verification.empty')}</p>
        ) : (
          queue.map((entry) => (
            <QueueCard key={entry.teacherUserId} entry={entry} onDone={() => void reload()} />
          ))
        )}

        <div className={styles.card}>
          <div className={styles.sectionTitle}>{t('verification.logTitle')}</div>
          <p className={styles.muted}>{t('verification.logSub')}</p>
          {log.length === 0 ? (
            <p className={styles.muted}>{t('verification.logEmpty')}</p>
          ) : (
            log.map((row) => (
              <div className={styles.logRow} key={row.id}>
                <span className={styles.logAt}>{STAMP.format(new Date(row.at))}</span>
                <span>
                  <b>{row.actorName}</b> {t(`verification.action.${row.action}`)}
                  {row.subjectName ? ` · ${row.subjectName}` : ''}
                  {row.objectLabel ? ` · ${row.objectLabel}` : ''}
                  <small className={styles.logWhy}>
                    {row.reason || t('verification.noReason')}
                  </small>
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function QueueCard({ entry, onDone }: { entry: Entry; onDone: () => void }) {
  const { t } = useTranslation('admin');
  const [asking, setAsking] = useState<'reject' | 'request' | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verify, { loading: verifying }] = useVerifyTeacherMutation();
  const [reject, { loading: rejecting }] = useRejectTeacherMutation();
  const [request, { loading: requesting }] = useRequestVerificationDocumentsMutation();

  const waited = Math.floor((Date.now() - new Date(entry.submittedAt).getTime()) / DAY_MS);
  const busy = verifying || rejecting || requesting;

  async function open(id: string) {
    setError(null);
    try {
      // Отдельный запрос на клик, а не ссылка в списке: ссылка живёт минуты, и — главное —
      // журнал должен записывать НАЖАТИЕ, а не построение списка.
      const { data } = await apolloClient.query({
        query: VerificationDocumentUrlDocument,
        variables: { id },
        fetchPolicy: 'network-only',
      });
      const url = data?.verificationDocumentUrl;
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
      else setError(t('verification.openFailed'));
      onDone(); // журнал пополнился — показать это сразу
    } catch {
      setError(t('verification.openFailed'));
    }
  }

  async function send() {
    if (!reason.trim()) {
      setError(t('verification.reasonRequired'));
      return;
    }
    setError(null);
    try {
      const variables = { teacherUserId: entry.teacherUserId, reason };
      if (asking === 'reject') await reject({ variables });
      else await request({ variables });
      setAsking(null);
      setReason('');
      onDone();
    } catch {
      setError(t('verification.failed'));
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.groupHead}>
        <span className={styles.groupName}>
          {entry.fullName}
        </span>
        <span className={styles.muted}>
          {t('verification.submitted', { date: DATE.format(new Date(entry.submittedAt)) })} ·{' '}
          {waited === 0 ? t('verification.waitingToday') : t('verification.waiting', { count: waited })}
        </span>
      </div>

      <div className={styles.factRow}>
        <span>
          <b>{t('verification.specialty')}</b> {entry.specialty || t('verification.noneStated')}
        </span>
        <span>
          <b>{t('verification.education')}</b> {entry.education || t('verification.noneStated')}
        </span>
        {/* Нагрузка: решение о допуске принимается по человеку целиком, а не по файлу. */}
        <span>
          <b>{t('verification.load')}</b>{' '}
          {t('verification.loadValue', {
            courses: entry.courseCount,
            sessions: entry.sessionCount,
          })}
        </span>
      </div>

      <div className={styles.muted}>{t('verification.documents')}</div>
      <div className={styles.chips}>
        {entry.documents.map((doc) => (
          <button
            key={doc.id}
            type="button"
            className={styles.chip}
            onClick={() => void open(doc.id)}
          >
            <FileText size={14} /> {doc.filename}
            {doc.sizeBytes ? ` · ${formatBytes(doc.sizeBytes)}` : ''}
          </button>
        ))}
      </div>

      {error && (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      )}

      {asking ? (
        <div className={styles.formRow}>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t(asking === 'reject' ? 'verification.reasonReject' : 'verification.reasonRequest')}
            aria-label={t(asking === 'reject' ? 'verification.reasonReject' : 'verification.reasonRequest')}
          />
          <Button variant="primary" size="sm" loading={busy} onClick={() => void send()}>
            {t('verification.send')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setAsking(null);
              setError(null);
            }}
          >
            {t('verification.cancel')}
          </Button>
        </div>
      ) : (
        <div className={styles.actionsRow}>
          <Button
            variant="primary"
            size="sm"
            loading={verifying}
            onClick={async () => {
              await verify({ variables: { teacherUserId: entry.teacherUserId } });
              onDone();
            }}
          >
            {t('verification.approve')}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setAsking('request')}>
            {t('verification.request')}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setAsking('reject')}>
            {t('verification.reject')}
          </Button>
        </div>
      )}
    </div>
  );
}
