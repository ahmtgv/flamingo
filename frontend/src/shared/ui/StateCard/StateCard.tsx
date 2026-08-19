import { type ReactNode } from 'react';

import styles from './stateCard.module.css';

export type StateKind = 'empty' | 'loading' | 'failed' | 'partial';

/**
 * КАРТОЧКА СОСТОЯНИЯ — одна на весь продукт (наряд 42 §3.3).
 *
 * ПРАВИЛА 6.1: у каждого экрана пять состояний, и сдать только «наполнено» — не сдать экран.
 * Четыре из них выглядят одинаково по строению, и раньше каждый экран изобретал их заново:
 * где-то «Что-то пошло не так», где-то крутящийся кружок, где-то пустота без единого слова.
 *
 * Строение с листов, сверху вниз:
 *   надзаголовок — ЧТО происходит и ГДЕ («ОТКАЗ · МЕДИАСЕРВЕР НЕ ОТВЕЧАЕТ»);
 *   заголовок    — человеческим языком, с исходом («Доска не открылась — урок идёт»);
 *   объяснение   — причина, что уцелело, что с данными;
 *   разбор       — что работает и что нет, по строкам (частичный отказ);
 *   действия     — первое главное, второе обходное. Их всегда есть хотя бы одно;
 *   сноска       — что будет, если не починится.
 *
 * 🔴 «Что-то пошло не так» запрещено (ПРАВИЛА 6.4): «не отвечает сервер» лечится одним
 * действием, «нет права» — другим, а общая фраза не лечится ничем.
 *
 * ⚠️ Частичный отказ — САМОСТОЯТЕЛЬНОЕ состояние, а не разновидность отказа, и рисуется он
 * ВНУТРИ своей области (доска — в области доски). Карточка поверх всего кадра врёт, будто не
 * работает ничего.
 */
export function StateCard({
  kind,
  where,
  title,
  children,
  works,
  broken,
  actions,
  note,
}: {
  kind: StateKind;
  /** Надзаголовок: где именно это происходит. Без него отказ безадресный. */
  where: string;
  title: string;
  children?: ReactNode;
  /** Частичный отказ: что продолжает работать. */
  works?: string;
  /** Частичный отказ: что именно сломано — и насколько узко. */
  broken?: string;
  actions?: ReactNode;
  note?: string;
}) {
  return (
    <section className={styles.card} data-kind={kind} role={kind === 'failed' ? 'alert' : 'status'}>
      <p className={styles.where}>{where}</p>
      <h2 className={styles.title}>{title}</h2>
      {children && <div className={styles.body}>{children}</div>}
      {(works || broken) && (
        <dl className={styles.split}>
          {works && (
            <div className={styles.splitRow}>
              <dt>{works}</dt>
            </div>
          )}
          {broken && (
            <div className={styles.splitRow}>
              <dd>{broken}</dd>
            </div>
          )}
        </dl>
      )}
      {actions && <div className={styles.actions}>{actions}</div>}
      {note && <p className={styles.note}>{note}</p>}
    </section>
  );
}
