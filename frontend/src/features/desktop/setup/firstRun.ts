/**
 * Правила первого запуска — atlas D2, OWNER_SCOPE §19 (Р5.4).
 *
 * Kept apart from the screens because the same rules are read in three places — the wizard,
 * the settings screen and the «готово» summary — and three components each deciding «is the
 * copy configured» is three chances to disagree in front of the one person who has not
 * decided yet whether to trust us.
 *
 * This is the only screen a teacher sees **before** they trust the product. The sheet says
 * it plainly: «Если здесь спросить лишнее или напугать — второго шанса не будет.»
 */

import type { BackupKind, UplinkVerdict } from '@/entities/graphql/generated';

/** Пять шагов листа: вход · данные · согласия · проверка · готово. */
export const SETUP_STEPS = ['pairing', 'cabinet', 'consents', 'check', 'done'] as const;
export type SetupStep = (typeof SETUP_STEPS)[number];

/** The server counts 1…5; the screens name them. One mapping, in one direction each way. */
export function stepFromNumber(n: number): SetupStep {
  return SETUP_STEPS[Math.min(Math.max(n, 1), SETUP_STEPS.length) - 1];
}
export function stepNumber(step: SetupStep): number {
  return SETUP_STEPS.indexOf(step) + 1;
}

/**
 * 🔴 §19.1 — копия обязательна.
 *
 * The single place in the whole product that forces anything, and the sheet earns it in one
 * sentence: «ноутбук — единственное место, где живут работы и оценки ваших учеников». The
 * server refuses `completeDeviceSetup` without it too; this is the same rule where the button
 * lives, so the teacher is not walked into a refusal.
 */
export function canLeaveCabinetStep(kind: BackupKind | null | undefined): boolean {
  return kind === 'EXTERNAL_DISK' || kind === 'CLOUD_FOLDER';
}

/**
 * Что показывает шаг 4: **размер группы**, а не «интернет хороший».
 *
 * The sheet's reasoning is the whole design of this function — «это то, чем преподаватель
 * распоряжается: расписание он менять умеет, а битрейт нет». So the verdict returns a number
 * of children, and the words around it are chosen by the screen from that number.
 */
export interface ChannelVerdict {
  /** Наибольшая группа, которую тянет этот канал. 0 — не тянет никакую. */
  groupSize: number;
  /** Which of the sheet's three cases this is: хороший · слабый · не годится. */
  tone: 'good' | 'weak' | 'unusable';
}

export function channelVerdict(verdict: UplinkVerdict, groupSize: number): ChannelVerdict {
  if (verdict === 'COMFORTABLE') return { groupSize, tone: 'good' };
  if (verdict === 'WORKABLE') return { groupSize, tone: groupSize >= 8 ? 'good' : 'weak' };
  if (verdict === 'TIGHT') return { groupSize, tone: 'weak' };
  return { groupSize: verdict === 'TOO_WEAK' ? 0 : groupSize, tone: 'unusable' };
}

/**
 * 🔴 §19.3 — предупреждаем, не запрещаем.
 *
 * A weak channel never blocks anything: not the next step, not creating a lesson, not the
 * lesson itself. The teacher knows what the lesson is and who the children are, and a product
 * that refuses to start one over a bandwidth estimate has taken a decision that was not its
 * to take. The function exists so that the rule is asserted rather than merely intended.
 */
export function canLeaveCheckStep(): boolean {
  return true;
}

/** Осталось до истечения кода, в виде «9:41». Ноль — код мёртв, нужен новый. */
export function countdown(msLeft: number): string {
  const total = Math.max(0, Math.floor(msLeft / 1000));
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${mm}:${String(ss).padStart(2, '0')}`;
}

/**
 * Код на экране — «K7M · 4Q2».
 *
 * Split in the middle because six characters read off a screen across a room are read in two
 * halves whatever we do, and the space is easier to keep than to lose.
 */
export function formatPairingCode(code: string): string {
  const clean = code.trim().toUpperCase();
  return clean.length === 6 ? `${clean.slice(0, 3)} · ${clean.slice(3)}` : clean;
}
