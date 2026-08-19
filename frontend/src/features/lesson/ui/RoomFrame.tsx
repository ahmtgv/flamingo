import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useFrameControls } from '@/features/desktop/frameControls';

import { Logo } from '@/shared/ui';

import styles from './roomframe.module.css';

/**
 * The windows of the room — sheet «Комната урока» (design handover, 19.08).
 *
 * 🔴 «КЛАСС» БОЛЬШЕ НЕ ОКНО. Раньше класс был пятым окном и включался вместо доски; теперь
 * лица стоят в правой колонке ПОСТОЯННО, и переключаться между «людьми» и «материалом» не
 * нужно — видно и то и другое. Довод листа: половина языкового урока — просто разговор, и
 * ради него не должно требоваться действие.
 *
 * ⚠️ Это изменение СОСТАВА контрактного листа 02, а не вида. Записано в отчёте наряда 41 и
 * в `docs/handoff/ROOM_REBUILD_2026-08-19.md` — вместе с исчезнувшим переключателем раскладки.
 */
export const SCENES = ['board', 'material', 'test', 'summary'] as const;
export type Scene = (typeof SCENES)[number];

/** Панели. Панель ЛИЧНАЯ: словарь открыт только у вас, у класса сцена не двигается. */
export const PANES = ['people', 'dict', 'mats', 'chat'] as const;
export type Pane = (typeof PANES)[number];

/** Через сколько молчания пульты уходят с глаз. Видео во весь экран — наряд 38 §1. */
const HUD_IDLE_MS = 5000;

/** Доля кадра под лицами: доля по умолчанию и границы, за которые тянуть нельзя (лист, правило 03). */
const RATIO_DEFAULT = 22;
const RATIO_MIN = 12;
const RATIO_MAX = 62;
/** Шаг стрелками: тянуть мышью умеют не все, а решить, чего на экране больше, вправе каждый. */
const RATIO_STEP = 4;

/**
 * Живая комната.
 *
 * Кадр целиком: слева сцена (доска, методичка, тест, конспект), справа колонка класса — она
 * стоит всегда. Управление живёт в двух ПЛАВАЮЩИХ пультах поверх кадра, а не в полосах,
 * которые отъедают высоту: сверху «куда я попал и что показываю», снизу «что я делаю».
 *
 * Панель (участники, словарь, материалы, чат) — накладная, поверх сцены справа, и по
 * умолчанию закрыта: занятие важнее инструмента.
 */
export function RoomFrame({
  title,
  meta,
  isLive,
  stateTag,
  scene,
  onScene,
  pane,
  onPane,
  sessionId,
  controls,
  topActions,
  classPane,
  privacy,
  children,
  sceneBody,
  panel,
  roomAudio,
  leaveLabel,
  onLeave,
}: {
  title: string;
  meta: string;
  isLive: boolean;
  /** Слово о состоянии комнаты: «идёт 24 из 45 минут», «подключаемся», «без эфира». */
  stateTag?: string;
  scene: Scene;
  onScene: (scene: Scene) => void;
  /** `null` — панель закрыта. Закрытая панель это состояние, а не отсутствие панели. */
  pane: Pane | null;
  onPane: (pane: Pane | null) => void;
  sessionId: string;
  /** Кнопки нижнего пульта до разделителя: микрофон, камера, экран, доска / поднять руку. */
  controls?: ReactNode;
  /** Верхний пульт: «где показываем» — второй экран и отдельное окно. */
  topActions?: ReactNode;
  /**
   * Правая колонка: внимание класса, лица, своя камера. Стоит всегда.
   * Получает долю кадра, потому что от неё зависит, колонка это или решётка.
   */
  classPane?: (ratio: number) => ReactNode;
  /**
   * 🔴 ПОКАЗАТЕЛЬ «КАДРЫ ОСТАЮТСЯ НА УСТРОЙСТВЕ» — ОБЯЗАТЕЛЕН (CLAUDE.md §7).
   *
   * Я убрал его из нижнего пульта, потому что пульт от него разваливался на две строки, и
   * сослался на ПРАВИЛА 8.2 («сказано один раз»). Караул `LiveRoomScreen.test` поймал сразу:
   * правило проекта сильнее правила листа, и здесь оно право — это единственное обещание,
   * которое продукт даёт про камеру.
   *
   * Дом ему — подвал колонки класса: там сама камера и там же тихая строка про неё. Когда
   * колонки нет (преподаватель ещё не назван), показатель уходит в слой состояний.
   */
  privacy?: ReactNode;
  /** Состояния комнаты: вход в эфир, обрыв, конец урока, отчёт. Слой поверх сцены. */
  children: ReactNode;
  /** Сама сцена: доска, методичка, тест, конспект. Во весь кадр, под слоем состояний. */
  sceneBody?: ReactNode;
  panel: ReactNode;
  /** Звук комнаты — вне сцен, см. `RoomAudio` (наряд 38). */
  roomAudio?: ReactNode;
  leaveLabel?: string;
  onLeave?: () => void;
}) {
  const { t } = useTranslation('room');
  const navigate = useNavigate();
  const frameSlot = useFrameControls();

  /**
   * 🔴 ПУЛЬТЫ УХОДЯТ С ГЛАЗ, ПОКА ЧЕЛОВЕК ИХ НЕ ТРОГАЕТ.
   *
   * Иначе «видео во весь экран» не выполняется: две полосы поверх кадра съедают его всегда,
   * даже когда никто ничего не нажимает.
   *
   * ⚠️ На пальцах первое касание будит пульт, а не нажимает кнопку: `pointerdown` приходит
   * раньше клика, и к моменту клика пульт уже проснулся, но палец уже поднят. Цена принята —
   * продукт настольный (кадры 1280 и 1512, приложение на маке). Клавиатура не страдает:
   * фокус будит пульт, и пока фокус внутри, он не гаснет.
   */
  const [hudAwake, setHudAwake] = useState(true);
  /** Сколько кадра отдано лицам. Решает человек, не мы: у кого-то урок про доску, у кого-то про людей. */
  const [ratio, setRatio] = useState(RATIO_DEFAULT);
  const panesRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const setRatioClamped = useCallback(
    (next: number) => setRatio(Math.min(RATIO_MAX, Math.max(RATIO_MIN, next))),
    [],
  );
  const idleTimer = useRef<ReturnType<typeof setTimeout>>();
  const wake = useCallback(() => {
    setHudAwake(true);
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setHudAwake(false), HUD_IDLE_MS);
  }, []);

  useEffect(() => {
    wake();
    const on = (e: Event) => {
      // Фокус внутри пульта держит его открытым: иначе клавиатура водила бы по невидимому.
      if (e.type === 'focusin' && (e.target as Element | null)?.closest?.(`.${styles.hud}`)) {
        clearTimeout(idleTimer.current);
        setHudAwake(true);
        return;
      }
      wake();
    };
    for (const ev of ['pointermove', 'pointerdown', 'keydown', 'focusin']) {
      window.addEventListener(ev, on);
    }
    return () => {
      clearTimeout(idleTimer.current);
      for (const ev of ['pointermove', 'pointerdown', 'keydown', 'focusin']) {
        window.removeEventListener(ev, on);
      }
    };
  }, [wake]);

  const windows = (
    <div className={styles.wins} role="tablist" aria-label={t('windows.label')}>
      {/*
        🔴 `aria-required-children/critical` — внутри `role="tablist"` не должно быть ничего,
        кроме вкладок. Обёртка снимается с дерева доступности через `presentation`.

        ⚠️ Комментарий стоит ЗДЕСЬ, а не первым элементом внутри стрелки `map`: там это
        синтаксическая ошибка, и dev-сервер отдаёт 500 на всё приложение.
      */}
      {SCENES.map((id) => (
        <span key={id} className={styles.winWrap} role="presentation">
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
        </span>
      ))}
    </div>
  );

  return (
    <div className={styles.shell}>
      {/* 🔴 Звук комнаты — вне сцен и вкладок: он не должен исчезать при переключении окна. */}
      {roomAudio}

      <div
        className={styles.panes}
        ref={panesRef}
        onPointerMove={(e) => {
          if (!dragging.current || !panesRef.current) return;
          const box = panesRef.current.getBoundingClientRect();
          setRatioClamped(Math.round(((box.right - e.clientX) / box.width) * 100));
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
      >
        <main
          className={styles.board}
          id="room-scene"
          role="tabpanel"
          aria-labelledby={`room-win-${scene}`}
          data-geo="доска"
        >
          {/*
            🔴 СОСТОЯНИЯ КОМНАТЫ — ОТДЕЛЬНЫМ СЛОЕМ, В ЗОНЕ, СВОБОДНОЙ ОТ ПУЛЬТОВ.
            Первая сборка положила карточку «Войти в эфир» в левый верхний угол сцены — ровно
            туда, где плавает верхний пульт. Пульт просыпается от движения указателя раньше,
            чем палец доходит до кнопки, и забирает нажатие себе: замер показал успешный клик
            и ноль последствий. Слой отступает от обоих пультов ровно на их высоту.
          */}
          <div className={styles.states} data-room-states data-overlay-ok>
            {!classPane && privacy}
            {children}
          </div>
          <div className={styles.scene} data-room-scene>
            {sceneBody}
          </div>
        </main>

        {/* Колонка класса стоит всегда — и когда сцена пуста, и когда идёт тест. */}
        {classPane && (
          <>
            {/*
              Граница между доской и лицами тянется мышью — и стрелками с клавиатуры.
              `separator` с `aria-valuenow` — единственный способ сказать читалке, что это
              не украшение, а регулятор, и в каком он положении.
            */}
            <div
              className={styles.divider}
              role="separator"
              aria-label={t('classPane.ratio')}
              aria-orientation="vertical"
              aria-valuenow={ratio}
              aria-valuemin={RATIO_MIN}
              aria-valuemax={RATIO_MAX}
              tabIndex={0}
              onPointerDown={(e) => {
                dragging.current = true;
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft') setRatioClamped(ratio + RATIO_STEP);
                if (e.key === 'ArrowRight') setRatioClamped(ratio - RATIO_STEP);
              }}
            />
            <aside
              className={styles.classPane}
              data-geo="полоса лиц"
              style={{ inlineSize: `${ratio}%` }}
            >
              {classPane(ratio)}
              <div className={styles.paneFoot}>{privacy}</div>
            </aside>
          </>
        )}
      </div>

      <div className={`${styles.hud} ${styles.hudTop}`} data-awake={hudAwake} data-hud="top">
        <button
          type="button"
          className={styles.logoBtn}
          onClick={() => navigate('/start')}
          aria-label="Flamingo"
        >
          <Logo word={false} />
        </button>
        <button type="button" className={styles.exit} onClick={onLeave}>
          {t('exit')}
        </button>
        <span className={styles.hudSep} aria-hidden="true" />
        <span className={styles.who}>
          <span className={styles.whoName}>{title}</span>
          <span className={styles.whoMeta}>{meta}</span>
        </span>
        {stateTag && (
          <span className={styles.stateTag} data-live={isLive}>
            <i aria-hidden="true" />
            {stateTag}
          </span>
        )}
        {/* В приложении переключатели окон уезжают в полосу состояния рамы; в браузере и вне
            урока полосы нет, и они остаются в пульте — иначе управление окнами исчезло бы. */}
        {frameSlot ? createPortal(windows, frameSlot) : windows}
        {topActions}
        <button
          type="button"
          className={styles.popOut}
          onClick={() => window.open(`/sessions/${sessionId}/window/${scene}`, '_blank', 'noopener')}
        >
          {t('windows.popOutShort')}
        </button>
      </div>

      <div className={`${styles.hud} ${styles.hudBottom}`} data-awake={hudAwake} data-hud="bottom">
        {controls}
        <span className={styles.hudSep} aria-hidden="true" />
        {PANES.map((id) => (
          <button
            key={id}
            type="button"
            className={styles.paneBtn}
            aria-pressed={pane === id}
            aria-expanded={pane === id}
            aria-controls="room-pane"
            onClick={() => onPane(pane === id ? null : id)}
          >
            {t(`panes.${id}`)}
          </button>
        ))}
        <span className={styles.hudSep} aria-hidden="true" />
        <button type="button" className={styles.leave} onClick={onLeave}>
          {leaveLabel ?? t('leave')}
        </button>
      </div>

      {pane && (
        <div className={styles.panel} id="room-pane" role="region" aria-label={t(`panes.${pane}`)}>
          <div className={styles.panelHead}>
            <span className={styles.panelTitle}>{t(`panes.${pane}`)}</span>
            <button
              type="button"
              className={styles.panelClose}
              aria-label={t('panes.close')}
              onClick={() => onPane(null)}
            >
              ×
            </button>
          </div>
          <div className={styles.panelBody}>{panel}</div>
        </div>
      )}
    </div>
  );
}
