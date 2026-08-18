/**
 * Окно «Класс» — who gets which tile (atlas sheet D1, owner decisions 14.08).
 *
 * Half of a language lesson is just talking, and then the screen belongs to **people, not an
 * empty board**. This module decides where each person goes; the component only draws it.
 *
 * 🔴 The one rule that must never bend: **преподаватель виден всегда.** Not «active speaker»
 * jumping around the frame — a constant anchor for the lesson. It is enforced structurally
 * here (the teacher IS the main seat, there is no branch that can drop them) rather than by a
 * component remembering to render them, because a rule a component has to remember is a rule
 * that survives until someone edits the component.
 */

/** Три раскладки полосы состояния: вдвоём · группа · ученик рядом. */
export const CLASS_LAYOUTS = ['pair', 'group', 'pinned'] as const;
export type ClassLayout = (typeof CLASS_LAYOUTS)[number];

import type { RemoteTrack } from 'livekit-client';

export interface Participant {
  id: string;
  name: string;
  /** Initials for the tile before video arrives — the sheet draws these, not avatars. */
  initials: string;
  /**
   * 🔴 ЭТОГО ПОЛЯ НЕ БЫЛО, И ПОЭТОМУ ОКНО «КЛАСС» НЕ ПОКАЗЫВАЛО ВИДЕО НИКОГДА
   * (найдено на живом уроке 18.08, наряд 37 §1.3).
   *
   * Владелец: «в приложении и в браузере моя камера во вкладке Класс не работает». То, что
   * в ОБОИХ, и было главной уликой: дело не в приложении и не в правах macOS. `ClassWindow`
   * рисовал только инициалы — макет по листу, который так и не соединили с эфиром. Комментарий
   * рядом («Initials for the tile BEFORE video arrives») обещал видео, которому неоткуда было
   * взяться: дорожки в плитку не приходило вовсе.
   *
   * `track` — камера удалённого участника, `selfStream` — свой поток (его LiveKit не отдаёт:
   * себя видно локально). Обоих может не быть — тогда инициалы, как и задумано.
   */
  track?: RemoteTrack;
  selfStream?: MediaStream | null;
  /** True for the person at this machine, drawn with a dashed border as «вы». */
  isSelf?: boolean;
  speaking?: boolean;
  handRaised?: boolean;
  /** Р5.1: the app lowered this stream's quality to keep the lesson going. */
  degraded?: boolean;
}

export interface Seating {
  /** The big tile beside the teacher. Empty unless a pupil is pinned. */
  main: Participant | null;
  /** The teacher — their own seat, never shared with the logic above. */
  teacher: Participant;
  /** Tiles in the upper half, beside teacher and main. */
  side: Participant[];
  /** The strip along the bottom. */
  row: Participant[];
}

/** How many pupils share the second half before the rest drop to the strip. */
const SIDE_CAPACITY = 4;

/**
 * Seat everyone.
 *
 * * **вдвоём** — преподаватель и ученик делят экран поровну. One pupil, no strip.
 * * **группа** (трое и больше) — преподаватель занимает бо́льшую половину, остальные
 *   распределяются по второй; whoever does not fit goes to the strip.
 * * **ученик рядом** — the pinned pupil is on the big screen next to the teacher and
 *   «остальные уходят в ленту внизу».
 *
 * ⚠️ In `pinned` the sheet's own prototype hides the bottom strip in CSS while its caption and
 * its decisions block both say the others wait in it. Two statements of the decision against
 * one line of prototype styling — the strip stays. Recorded in the phase report rather than
 * quietly resolved.
 */
export function seats(
  teacher: Participant,
  pupils: Participant[],
  layout: ClassLayout,
  pinnedId?: string,
): Seating {
  if (layout === 'pair') {
    // Deliberately not «the first two»: with more than one pupil the pair layout is the wrong
    // one, and the switcher — not this function — is where that is decided.
    const [companion, ...rest] = pupils;
    return { teacher, main: companion ?? null, side: [], row: rest };
  }

  if (layout === 'pinned') {
    const pinned = pupils.find((p) => p.id === pinnedId) ?? pupils[0] ?? null;
    return {
      teacher,
      main: pinned,
      side: [],
      row: pupils.filter((p) => p.id !== pinned?.id),
    };
  }

  return {
    teacher,
    main: null,
    side: pupils.slice(0, SIDE_CAPACITY),
    row: pupils.slice(SIDE_CAPACITY),
  };
}

/**
 * The name a small tile carries.
 *
 * The sheet writes «Аня», «Петя», «Лена» on the tiles and keeps «Люция Валерьевна» for the big
 * one, and that is not decoration: a 150px tile cannot hold «Тимур Ибрагимов», so the choice is
 * a first name or a clipped full one. A clipped name is the version that looks like a bug.
 */
export function tileName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

/**
 * Which layout suits this many pupils, when the teacher has not chosen one.
 *
 * A suggestion, never a lock: the switcher stays available in every case. «Не изобретать
 * ограничений» (PROMPT_14 §2.2-бис) — the frame may open on a sensible default and must not
 * refuse the others.
 */
export function suggestedLayout(pupilCount: number): ClassLayout {
  return pupilCount <= 1 ? 'pair' : 'group';
}
