import { type ReactNode } from 'react';

import styles from './Badge.module.css';

/**
 * 🔴 СЛОВАРЬ МЕТКИ СМЕНИЛСЯ ВМЕСТЕ С ЛИСТАМИ (наряд 42 §1).
 *
 * Было светофорное: `success · warning · error · info · accent`. Стало два смысла и
 * нейтральное, по ПРАВИЛАМ 5.8 и 5.13:
 *
 *   now  — то, что ГОРИТ: срок, отмена, «идёт сейчас», поднятая рука;
 *   done — то, что РЕШЕНО: работа принята, тест сдан, урок пройден;
 *   loud — заливка; только там, где метка сама главное на экране (одна на экран);
 *   neutral — всё остальное: номера, счётчики, служебные подписи. Цветом не красятся вовсе.
 *
 * `success` был не тем же, что `done`: он говорит «операция прошла» — это сообщение формы,
 * а не смысл учёбы. Смешивать их нельзя, даже когда оттенки похожи.
 */
export type BadgeTone = 'now' | 'done' | 'loud' | 'neutral';

export interface BadgeProps {
  tone?: BadgeTone;
  dot?: boolean;
  children: ReactNode;
}

export function Badge({ tone = 'neutral', dot, children }: BadgeProps) {
  return (
    <span className={[styles.badge, styles[tone]].join(' ')}>
      {dot && <span className={styles.dot} aria-hidden="true" />}
      {children}
    </span>
  );
}
