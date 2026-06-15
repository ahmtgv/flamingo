import {
  ArrowLeft,
  BarChart3,
  Check,
  LogOut,
  Moon,
  Play,
  Radio,
  Square,
  Sun,
  Video,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { toggleTheme } from '@/app/uiSlice';
import { useLogout } from '@/app/useLogout';
import {
  type SessionStatus,
  useEndSessionMutation,
  useJoinSessionMutation,
  useMeQuery,
  useMyScheduleQuery,
  useStartSessionMutation,
} from '@/entities/graphql/generated';
import { Badge, type BadgeTone, Button, Logo } from '@/shared/ui';

import styles from './schedule.module.css';

const STATUS_TONE: Record<SessionStatus, BadgeTone> = {
  SCHEDULED: 'neutral',
  LIVE: 'success',
  ENDED: 'neutral',
  CANCELED: 'error',
};

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function ScheduleScreen() {
  const { t } = useTranslation(['schedule', 'common']);
  const navigate = useNavigate();
  const theme = useAppSelector((s) => s.ui.theme);
  const dispatch = useAppDispatch();
  const logout = useLogout();
  const goingDark = theme === 'light';

  const range = useMemo(() => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const to = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    return { from, to };
  }, []);

  const { data, loading, refetch } = useMyScheduleQuery({ variables: range });
  const { data: meData } = useMeQuery();
  const isTeacher = meData?.me?.role === 'TEACHER';

  const [startSession] = useStartSessionMutation();
  const [endSession] = useEndSessionMutation();
  const [joinSession] = useJoinSessionMutation();
  const [joined, setJoined] = useState<Set<string>>(new Set());

  const sessions = data?.mySchedule ?? [];

  async function handleJoin(id: string) {
    // Acquire the room token + create ATTENDANCE, then enter the live CMF room where
    // the on-device attention pipeline runs.
    const res = await joinSession({ variables: { sessionId: id } });
    if (res.data?.joinSession.roomToken) {
      setJoined((prev) => new Set(prev).add(id));
      navigate(`/sessions/${id}/room`);
    }
  }

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <button type="button" className={styles.logoBtn} onClick={() => navigate('/app')} aria-label="Flamingo">
          <Logo />
        </button>
        <div className={styles.topActions}>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => dispatch(toggleTheme())}
            aria-label={goingDark ? t('common:theme.toDark') : t('common:theme.toLight')}
          >
            {goingDark ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button type="button" className={styles.iconBtn} onClick={() => void logout()} aria-label={t('common:actions.loading')}>
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className={styles.content}>
        <button type="button" className={styles.back} onClick={() => navigate('/app')}>
          <ArrowLeft size={15} /> {t('back')}
        </button>
        <h1 className={styles.pageTitle}>{t('title')}</h1>
        <p className={styles.pageSub}>{t('subtitle')}</p>

        {sessions.length === 0 ? (
          <p className={styles.empty}>{loading ? t('common:actions.loading') : t('empty')}</p>
        ) : (
          sessions.map((s) => (
            <div className={styles.session} key={s.id}>
              <Video size={18} />
              <div className={styles.sessionMain}>
                <div className={styles.sessionTitle}>{s.lesson?.title ?? t('noLesson')}</div>
                <div className={styles.sessionTime}>{formatTime(s.startAt)}</div>
              </div>
              <Badge tone={STATUS_TONE[s.status]} dot={s.status === 'LIVE'}>
                {t(`status.${s.status}`)}
              </Badge>
              <div className={styles.sessionActions}>
                {isTeacher && s.status === 'SCHEDULED' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Play size={15} />}
                    onClick={async () => {
                      await startSession({ variables: { sessionId: s.id } });
                      await refetch();
                    }}
                  >
                    {t('actions.start')}
                  </Button>
                )}
                {isTeacher && s.status === 'LIVE' && (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Radio size={15} />}
                      onClick={() => navigate(`/sessions/${s.id}/room`)}
                    >
                      {t('actions.room')}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Square size={15} />}
                      onClick={async () => {
                        await endSession({ variables: { sessionId: s.id } });
                        await refetch();
                      }}
                    >
                      {t('actions.end')}
                    </Button>
                  </>
                )}
                {isTeacher && s.status === 'ENDED' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<BarChart3 size={15} />}
                    onClick={() => navigate(`/sessions/${s.id}/room`)}
                  >
                    {t('actions.report')}
                  </Button>
                )}
                {s.status === 'LIVE' &&
                  (joined.has(s.id) ? (
                    <span className={styles.joined}>
                      <Check /> {t('actions.joined')}
                    </span>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Radio size={15} />}
                      onClick={() => handleJoin(s.id)}
                    >
                      {t('actions.join')}
                    </Button>
                  ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
