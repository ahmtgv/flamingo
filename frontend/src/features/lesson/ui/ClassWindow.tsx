import { useTranslation } from 'react-i18next';

import { type ClassLayout, type Participant, seats, tileName } from '../classLayout';

import styles from './classwindow.module.css';

/**
 * Окно «Класс» — atlas sheet D1, owner decisions 14.08.
 *
 * The first window in the switcher, and the one that exists because half of a language lesson
 * has no material in it at all. Board, guide and test are material; a conversation is people,
 * and then the screen belongs to them rather than to an empty canvas.
 *
 * 🔴 **Преподаватель виден всегда.** Not the active speaker — a constant anchor. The teacher's
 * tile is rendered outside the layout branches for that reason: there is no code path here
 * that can produce a class window without them.
 *
 * The window is a layout, not a connection. Switching between «Класс» and the board changes
 * what the window draws and nothing else — «переключение не рвёт соединение».
 *
 * It is called «Класс», not «Люди» (owner, 14.08).
 */
export function ClassWindow({
  teacher,
  pupils,
  layout,
  pinnedId,
  onPin,
}: {
  teacher: Participant;
  pupils: Participant[];
  layout: ClassLayout;
  pinnedId?: string;
  onPin?: (id: string) => void;
}) {
  const { t } = useTranslation('desktop');
  const seating = seats(teacher, pupils, layout, pinnedId);

  const tile = (p: Participant, big: boolean) => (
    <div
      key={p.id}
      className={big ? styles.mainTile : styles.tile}
      data-speaking={p.speaking || undefined}
      data-self={p.isSelf || undefined}
      data-hand={p.handRaised || undefined}
      data-degraded={p.degraded || undefined}
    >
      <span className={styles.ini} aria-hidden="true">
        {p.initials}
      </span>
      <span className={styles.who}>
        {p.isSelf ? t('class.self') : big ? p.name : tileName(p.name)}
      </span>
      {p.handRaised && <span className={styles.hand}>{t('class.handRaised')}</span>}
      {/* Р5.1: где качество снижено — видно на плитке, а не только в полосе. */}
      {p.degraded && <span className={styles.degraded}>{t('class.degraded')}</span>}
      {!p.isSelf && onPin && (
        <button type="button" className={styles.pinBtn} onClick={() => onPin(p.id)}>
          {t('class.pin')}
        </button>
      )}
    </div>
  );

  return (
    <div className={styles.faces} data-layout={layout}>
      <div className={styles.stage}>
        {/* Преподаватель — вне ветвлений раскладки. */}
        <div className={styles.mainTile} data-teacher="true">
          <span className={styles.roleTag}>{t('class.teacher')}</span>
          <span className={styles.ini} aria-hidden="true">
            {seating.teacher.initials}
          </span>
          <span className={styles.who}>
            <i aria-hidden="true" />
            {seating.teacher.name}
          </span>
        </div>

        {seating.main && tile(seating.main, true)}

        {seating.side.length > 0 && (
          <div className={styles.side}>{seating.side.map((p) => tile(p, false))}</div>
        )}
      </div>

      {seating.row.length > 0 && (
        <div className={styles.row}>
          {seating.row.map((p) => tile(p, false))}
          <span className={styles.hint}>{t(`layout.hint.${layout}`)}</span>
        </div>
      )}
    </div>
  );
}
