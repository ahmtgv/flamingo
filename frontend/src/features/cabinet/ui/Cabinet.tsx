import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';

import { useAppDispatch } from '@/app/hooks';
import { setAgeMode } from '@/app/uiSlice';
import { useMeQuery } from '@/entities/graphql/generated';
import { ErrorState } from '@/shared/ui';

import { AdminCabinet } from './AdminCabinet';
import styles from './cabinet.module.css';
import { ParentCabinet } from './ParentCabinet';
import { StudentCabinet } from './StudentCabinet';
import { TeacherCabinet } from './TeacherCabinet';

/** Resolves the viewer and renders the cabinet for their role. */
export function Cabinet() {
  const { t } = useTranslation('common');
  const dispatch = useAppDispatch();
  const { data, loading, error, refetch } = useMeQuery();
  const me = data?.me;

  // The root age mode follows the pupil's age band (junior -> kids tokens).
  useEffect(() => {
    dispatch(setAgeMode(me?.studentProfile?.ageBand === 'JUNIOR' ? 'kids' : 'default'));
  }, [me, dispatch]);

  if (loading && !me) {
    return (
      <div className={styles.shell} style={{ alignItems: 'center', justifyContent: 'center' }}>
        {t('actions.loading')}
      </div>
    );
  }
  // A transient `me` failure (network/server) must NOT bounce an authenticated user to /login —
  // show a retryable error instead. A genuinely anonymous session resolves me=null with no error
  // and still redirects to login. (B-states-2)
  if (error && !me) {
    return (
      <div className={styles.shell} style={{ alignItems: 'center', justifyContent: 'center' }}>
        <ErrorState error={error} onRetry={() => void refetch()} />
      </div>
    );
  }
  if (!me) return <Navigate to="/login" replace />;

  switch (me.role) {
    case 'PARENT':
      return <ParentCabinet me={me} refetchMe={refetch} />;
    case 'TEACHER':
      return <TeacherCabinet me={me} />;
    case 'ADMIN':
      return <AdminCabinet me={me} />;
    case 'STUDENT':
    default:
      return <StudentCabinet me={me} />;
  }
}
