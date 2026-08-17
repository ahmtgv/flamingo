import { type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { isDesktop } from '@/features/desktop/bridge';
import { useFrameControls } from '@/features/desktop/frameControls';

import { Logo } from '@/shared/ui';

import styles from './roomframe.module.css';

/**
 * The windows of sheet 02. The scene is shared — what the teacher shows, everyone sees.
 *
 * «Класс» is first, and it is first for a reason (sheet D1, owner 14.08): board, guide and test
 * are all *material*, and half of a language lesson has none — it is just talking. When that is
 * what is happening, the screen belongs to people rather than to an empty canvas.
 */
export const SCENES = ['class', 'board', 'material', 'test', 'summary'] as const;
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
  layoutSwitch,
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
  /** «вдвоём · группа · ученик рядом» — only the «Класс» window has anything to switch. */
  layoutSwitch?: ReactNode;
  children: ReactNode;
  panel: ReactNode;
}) {
  const { t } = useTranslation('room');
  const navigate = useNavigate();
  const frameSlot = useFrameControls();

  const windows = (
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
      {layoutSwitch}
      {/* Подсказка про отдельную вкладку уступает место переключателю раскладки: в
          одной строке они не помещаются, а управление важнее пояснения. */}
      {!layoutSwitch && <span className={styles.winsNote}>{t('windows.note')}</span>}
    </div>
  );

  return (
    <div className={styles.shell}>
      {/* 🔴 ВТОРАЯ ПОЛОСА С ЛОГОТИПОМ (владелец 17.08: «выглядит как поломанный код»).
          В приложении строка заголовка уже несёт знак бренда и версию — эта рисовалась
          сразу под ней, третьей по счёту после системной. Лист D1 показывает содержимое
          СРАЗУ под полосой состояния, без своей шапки. В браузере шапка нужна: там нет
          рамы, и уйти из комнаты больше нечем. */}
      {!isDesktop() && (
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
      )}

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
            {/* В окне «Класс» верхняя полоса скрыта: она дублировала бы кадры и отъедала
                высоту у главного (лист D1). */}
            {strip && scene !== 'class' && <div className={styles.strip}>{strip}</div>}

            {/* 🔴 Лист D1, правка владельца 14.08: «отдельной строки над сценой БОЛЬШЕ НЕ
                СУЩЕСТВУЕТ… это вернуло сцене около семидесяти пикселей». Внутри приложения
                во время урока переключатели уезжают в полосу состояния рамы; в браузере и
                вне урока полосы нет, и они остаются здесь — иначе управление окнами просто
                исчезло бы. */}
            {frameSlot ? createPortal(windows, frameSlot) : windows}

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
