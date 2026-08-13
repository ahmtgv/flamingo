import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { Logo } from '@/shared/ui';

import styles from './roomframe.module.css';

/** The four windows of sheet 02. The scene is shared — what the teacher shows, everyone sees. */
export const SCENES = ['board', 'material', 'test', 'summary'] as const;
export type Scene = (typeof SCENES)[number];

/** The four side panels. Unlike the scene, the panel is PERSONAL: you can keep the dictionary
 *  open while the board is on the scene, and nobody else's view moves. */
export const PANES = ['people', 'dict', 'mats', 'chat'] as const;
export type Pane = (typeof PANES)[number];

/**
 * The live room's frame — atlas sheet 02.
 *
 * Header (what lesson, is it running, actions) → video strip → scene → right panel. The frame
 * is the same for everyone: roles differ by rights, not by a different interface, so a pupil
 * and a teacher are looking at the same screen with different buttons on it.
 *
 * The scene is shared and the panel is personal. That split is the whole idea of the sheet:
 * the lesson stays in one place while each person keeps their own tool open beside it.
 */
export function RoomFrame({
  title,
  meta,
  isLive,
  elapsed,
  scene,
  onScene,
  pane,
  onPane,
  sessionId,
  actions,
  strip,
  children,
  panel,
}: {
  title: string;
  meta: string;
  isLive: boolean;
  elapsed?: string;
  scene: Scene;
  onScene: (scene: Scene) => void;
  pane: Pane;
  onPane: (pane: Pane) => void;
  sessionId: string;
  actions?: ReactNode;
  strip?: ReactNode;
  children: ReactNode;
  panel: ReactNode;
}) {
  const { t } = useTranslation('room');
  const navigate = useNavigate();

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <button
          type="button"
          className={styles.logoBtn}
          onClick={() => navigate('/start')}
          aria-label="Flamingo"
        >
          <Logo />
        </button>
      </header>

      <div className={styles.screen}>
        <div className={styles.roomTop}>
          <div className={styles.roomWho}>
            <span className={styles.roomName}>{title}</span>
            <span className={styles.roomMeta}>{meta}</span>
          </div>
          {isLive && (
            <span className={styles.liveTag}>
              <i aria-hidden="true" />
              {elapsed ? t('live.withTime', { time: elapsed }) : t('live.now')}
            </span>
          )}
          <div className={styles.roomActs}>{actions}</div>
        </div>

        <div className={styles.room}>
          <div className={styles.stage}>
            {strip && <div className={styles.strip}>{strip}</div>}

            <div className={styles.wins} role="tablist" aria-label={t('windows.label')}>
              {SCENES.map((id) => (
                <span key={id} className={styles.winWrap}>
                  <button
                    type="button"
                    role="tab"
                    id={`room-win-${id}`}
                    aria-controls="room-scene"
                    aria-selected={scene === id}
                    className={styles.win}
                    onClick={() => onScene(id)}
                  >
                    {t(`windows.${id}`)}
                  </button>
                  {/* Any window can leave for its own tab or a second display — that is what
                      «многоэкранность» means here. The lesson is not interrupted by it. */}
                  <button
                    type="button"
                    className={styles.pop}
                    aria-label={t('windows.popOut', { window: t(`windows.${id}`) })}
                    onClick={() =>
                      window.open(`/sessions/${sessionId}/window/${id}`, '_blank', 'noopener')
                    }
                  >
                    ↗
                  </button>
                </span>
              ))}
              <span className={styles.winsNote}>{t('windows.note')}</span>
            </div>

            <main
              className={styles.scene}
              id="room-scene"
              role="tabpanel"
              aria-labelledby={`room-win-${scene}`}
            >
              {children}
            </main>
          </div>

          <aside className={styles.side}>
            <div className={styles.sideTabs} role="tablist" aria-label={t('panes.label')}>
              {PANES.map((id) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  id={`room-pane-${id}`}
                  aria-controls="room-pane"
                  aria-selected={pane === id}
                  className={styles.sTab}
                  onClick={() => onPane(id)}
                >
                  {t(`panes.${id}`)}
                </button>
              ))}
            </div>
            <div
              className={styles.sideBody}
              id="room-pane"
              role="tabpanel"
              aria-labelledby={`room-pane-${pane}`}
            >
              {panel}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
