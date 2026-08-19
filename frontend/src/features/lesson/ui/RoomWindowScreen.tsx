import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { useSessionRoomQuery } from '@/entities/graphql/generated';

import styles from './roomwindow.module.css';
import { SCENES, type Scene } from './RoomFrame';

/**
 * One window of the lesson, on its own tab — the second half of «многоэкранность».
 *
 * The lesson is not interrupted by opening this: it is a separate view of the same session,
 * so the teacher can put the guide on one display and keep the class on the other.
 */
export function RoomWindowScreen() {
  const { t } = useTranslation('room');
  const { sessionId = '', scene = 'board' } = useParams();
  const { data } = useSessionRoomQuery({ variables: { id: sessionId }, skip: !sessionId });
  const known = (SCENES as readonly string[]).includes(scene) ? (scene as Scene) : 'board';
  const lesson = data?.session?.lesson?.title ?? '';

  return (
    <div className={styles.shell}>
      <div className={styles.screen}>
        <div className={styles.roomTop}>
          <div className={styles.roomWho}>
            <span className={styles.roomName}>
              {t('scene.windowTitle', { window: t(`windows.${known}`), lesson })}
            </span>
            <span className={styles.roomMeta}>{t('scene.windowHint')}</span>
          </div>
        </div>
        <p className={styles.sceneSoon}>{t(`scene.${known}Soon`)}</p>
      </div>
    </div>
  );
}
