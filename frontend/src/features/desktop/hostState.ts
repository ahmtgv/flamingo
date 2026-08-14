/**
 * What the window says about itself — atlas sheet D1.
 *
 * The app differs from a browser tab in three things, and this module owns the first two:
 * the lesson is being served **from this machine**, and the frame has to say so in one glance.
 * Sheet D1: «По центру — одно состояние машины. От него зависит, можно ли закрывать крышку, и
 * человек должен понимать это, просто взглянув на окно.»
 *
 * Kept as pure functions on purpose. The frame, the tray and the settings screen all describe
 * the same machine, and three components each deriving «is the channel bad» from raw megabits
 * is three chances to disagree in front of a teacher mid-lesson.
 *
 * 🔴 Owner decision 14.08 (D1): **the channel is shown in words.** Megabits, loss and bitrate
 * live in the settings screen — «преподавателю нужно решение, а не телеметрия». Nothing here
 * returns a number a teacher is expected to interpret.
 */

/** The verdict the server already computed from the measurement (`common/uplink.py`). */
export const UPLINK_VERDICTS = [
  'COMFORTABLE',
  'WORKABLE',
  'TIGHT',
  'TOO_WEAK',
  'UNKNOWN',
] as const;
export type UplinkVerdict = (typeof UPLINK_VERDICTS)[number];

/** The four states of sheet D1's switcher: урок нет · урок идёт · канал просел · нет сети. */
export type HostState = 'idle' | 'live' | 'weak' | 'offline';

/**
 * The channel in words. Four, not the three of the sheet — see `connectionWord`.
 */
export type ConnectionWord = 'good' | 'weak' | 'none' | 'unmeasured';

export interface HostFacts {
  /** Can this machine reach the network at all. */
  online: boolean;
  /** Is a lesson being served from here right now. */
  lessonLive: boolean;
  /** The last measurement's verdict, or UNKNOWN if the channel was never measured. */
  verdict: UplinkVerdict;
}

/**
 * One state out of the three facts.
 *
 * Order matters and is not arbitrary. No network beats everything: a good measurement from
 * twenty minutes ago says nothing about a lesson that cannot be joined now. A weak channel
 * only becomes a *state* while a lesson is running — outside one it is a fact for the settings
 * screen, and colouring an idle window yellow over it would be an alarm about nothing.
 */
export function hostState({ online, lessonLive, verdict }: HostFacts): HostState {
  if (!online) return 'offline';
  if (!lessonLive) return 'idle';
  return verdict === 'TIGHT' || verdict === 'TOO_WEAK' ? 'weak' : 'live';
}

/**
 * The channel, in the words a teacher reads.
 *
 * The owner named three — «хорошая / слабая / нет». There is a fourth here, `unmeasured`, and
 * it is not an invented restriction: a machine whose channel was never measured is a real
 * state (it is what D2 exists to resolve at first run), and the honest options were to say so
 * or to say «хорошая» about something nobody checked. Saying «хорошая» would be the frame
 * telling the teacher a thing it does not know.
 */
export function connectionWord({ online, verdict }: Pick<HostFacts, 'online' | 'verdict'>): ConnectionWord {
  if (!online) return 'none';
  if (verdict === 'UNKNOWN') return 'unmeasured';
  return verdict === 'COMFORTABLE' || verdict === 'WORKABLE' ? 'good' : 'weak';
}

/** Bars lit on the little meter beside the word — the sheet's «шкала, чтобы не читать цифру». */
export function meterLevel({ online, verdict }: Pick<HostFacts, 'online' | 'verdict'>): 0 | 1 | 2 | 3 | 4 {
  if (!online) return 0;
  switch (verdict) {
    case 'COMFORTABLE':
      return 4;
    case 'WORKABLE':
      return 3;
    case 'TIGHT':
      return 2;
    case 'TOO_WEAK':
      return 1;
    case 'UNKNOWN':
      return 0;
  }
}

/**
 * Is the status strip on screen?
 *
 * Sheet D1: «Когда урока нет — её нет вовсе: пустая строка с прочерками это шум.» It exists
 * for the lesson, the weak channel and the loss of network, and for nothing else.
 */
export function showsHostBar(state: HostState): boolean {
  return state !== 'idle';
}

/**
 * Does the title bar carry the lesson's name?
 *
 * Only while there is a lesson: «вне урока строка не носит пустое название». Offline is not a
 * lesson — the teacher cannot serve one, and a title claiming otherwise would be furniture.
 */
export function showsLessonTag(state: HostState): boolean {
  return state === 'live' || state === 'weak';
}

/**
 * Are the window and class-layout switchers offered?
 *
 * Hidden with no network: «переключать нечего, урока нет». The strip stays — it is what
 * carries the state — but it stops offering choices that lead nowhere.
 */
export function showsSwitchers(state: HostState): boolean {
  return state === 'live' || state === 'weak';
}
