import { type ReactNode, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { APP_VERSION, minimiseToTray, setTrayLabel } from './bridge';
import { ControlsContext } from './frameControls';
import {
  connectionWord,
  type HostFacts,
  hostState,
  meterLevel,
  showsHostBar,
  showsLessonTag,
  showsSwitchers,
} from './hostState';
import styles from './desktop.module.css';

/**
 * Рама приложения преподавателя — atlas sheet D1.
 *
 * The app differs from a browser tab in three things and this component is all three: it has
 * **its own title bar** instead of an address bar, the lesson **is served from this machine**,
 * and it can be **minimised without ending the lesson**. Everything inside the frame is the
 * already-approved screens — sheet 00 when there is no lesson, sheet 02 when there is. The
 * frame does not restyle them and does not decide what they show.
 *
 * Two owner edits of 14.08 shape the layout and are worth naming, because they cost the screen
 * two rows and gave the scene back about seventy pixels:
 *
 * * **Опознание урока живёт в заголовке окна.** The row that used to sit above the scene
 *   repeated what the teacher already knew and took height from the board.
 * * **Переключатели окон и раскладки класса переехали в полосу состояния.** One strip answers
 *   both «что с машиной» and «чем занят экран», and the eye stops travelling between three.
 */
export interface DesktopFrameProps extends HostFacts {
  /** Название урока для заголовка. Absent outside a lesson — «строка не носит пустое название». */
  lessonName?: string;
  lessonNumber?: number;
  participantCount?: number;
  /** Сколько учеников дошло: «двое не дошли, и это видно раньше, чем они напишут в чат». */
  joined?: number;
  /** Время с начала занятия, уже отформатированное. */
  elapsed?: string;
  /** «Скопировать ссылку», «Завершить» — the strip's right-hand actions. */
  actions?: ReactNode;
  onSettings?: () => void;
  children: ReactNode;
}

export function DesktopFrame({
  online,
  lessonLive,
  verdict,
  lessonName,
  lessonNumber,
  participantCount,
  joined,
  elapsed,
  actions,
  onSettings,
  children,
}: DesktopFrameProps) {
  const { t } = useTranslation('desktop');
  const [controls, setControls] = useState<ReactNode>(null);
  const controlsValue = useMemo(() => ({ controls, setControls }), [controls]);

  const facts: HostFacts = { online, lessonLive, verdict };
  const state = hostState(facts);
  const word = connectionWord(facts);
  const level = meterLevel(facts);

  const trayLabel =
    state === 'idle' || state === 'offline'
      ? t('tray.idle')
      : joined !== undefined && participantCount !== undefined
        ? t('tray.liveWith', { elapsed: elapsed ?? '', joined, total: participantCount })
        : t('tray.live', { elapsed: elapsed ?? '' });

  /**
   * 🔴 Свернуть — не завершить. The window goes away, the lesson does not: the pupils stay
   * connected to this machine and the tray keeps saying so. Ending a lesson is a separate
   * button with its own word, and it lives in the strip precisely because a teacher who
   * minimises the window forgets that the room is still open (sheet D1, «Завершить остаётся
   * в раме»).
   */
  const handleMinimise = () => {
    void setTrayLabel(trayLabel);
    void minimiseToTray();
  };

  return (
    <ControlsContext.Provider value={controlsValue}>
      <div className={styles.app} data-state={state}>
        <header className={styles.titlebar}>
          <span className={styles.appName}>
            <i className={styles.dot} aria-hidden="true" />
            {t('app.name')}
            <span className={styles.ver} title={t('app.version', { version: APP_VERSION })}>
              {APP_VERSION}
            </span>
          </span>

          {/* Опознание урока — в заголовке, и только пока урок идёт. */}
          {showsLessonTag(state) && lessonName && (
            <span className={styles.lessonTag}>
              <i className={styles.sepv} aria-hidden="true" />
              <span className={styles.lessonName}>{lessonName}</span>
              {lessonNumber !== undefined && participantCount !== undefined && (
                <span className={styles.lessonMeta}>
                  {t('title.lessonMeta', { number: lessonNumber, count: participantCount })}
                </span>
              )}
            </span>
          )}

          {/* По центру — одно состояние машины. */}
          <output className={styles.hostState} data-state={state} aria-label={t('host.label')}>
            <i className={styles.lamp} aria-hidden="true" />
            {t(`host.${state}`)}
          </output>

          <span className={styles.titleRight}>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={handleMinimise}
              title={t('title.minimise')}
              aria-label={t('title.minimise')}
            >
              ▾
            </button>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={onSettings}
              title={t('title.settings')}
              aria-label={t('title.settings')}
            >
              ⚙
            </button>
          </span>
        </header>

        {showsHostBar(state) && (
          <div className={styles.hostBar}>
            <span className={styles.fact}>
              <span className={styles.factK}>{t('link.label')}</span>
              {/* Связь словами. Мегабиты — в настройках (решение владельца 14.08). */}
              <span className={styles.factV} data-word={word}>
                {t(`link.${word}`)}
              </span>
            </span>

            <span
              className={styles.meter}
              data-level={level}
              role="img"
              aria-label={`${t('link.meter')}: ${t(`link.${word}`)}`}
            >
              <i /> <i /> <i /> <i />
            </span>

            <span className={styles.fact}>
              <span className={styles.factK}>{t('bar.connected')}</span>
              <span className={styles.factV}>
                {joined !== undefined && participantCount !== undefined
                  ? t('bar.connectedValue', { joined, total: participantCount })
                  : t('bar.empty')}
              </span>
            </span>

            <span className={styles.fact}>
              <span className={styles.factK}>{t('bar.elapsed')}</span>
              <span className={styles.factV}>{elapsed ?? t('bar.empty')}</span>
            </span>

            {/* Не «плохое соединение», а что мы уже сделали. Решение принимает приложение. */}
            {state === 'weak' && <span className={styles.hostWhy}>{t('bar.whyWeak')}</span>}
            {state === 'offline' && <span className={styles.hostWhy}>{t('bar.whyOffline')}</span>}

            {showsSwitchers(state) && controls}

            <span className={styles.hostActs}>{actions}</span>
          </div>
        )}

        <div className={styles.viewport}>{children}</div>
      </div>
    </ControlsContext.Provider>
  );
}
