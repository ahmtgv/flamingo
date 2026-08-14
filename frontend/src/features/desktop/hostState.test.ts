import { describe, expect, it } from 'vitest';

import {
  connectionWord,
  type HostFacts,
  hostState,
  meterLevel,
  showsHostBar,
  showsLessonTag,
  showsSwitchers,
  UPLINK_VERDICTS,
} from './hostState';

const facts = (over: Partial<HostFacts> = {}): HostFacts => ({
  online: true,
  lessonLive: false,
  verdict: 'COMFORTABLE',
  ...over,
});

describe('состояние машины (лист D1)', () => {
  it('без сети всё остальное неважно', () => {
    // A good measurement from twenty minutes ago says nothing about a lesson nobody can join.
    for (const verdict of UPLINK_VERDICTS) {
      expect(hostState(facts({ online: false, lessonLive: true, verdict }))).toBe('offline');
      expect(hostState(facts({ online: false, lessonLive: false, verdict }))).toBe('offline');
    }
  });

  it('слабый канал становится состоянием только во время урока', () => {
    // Outside a lesson a weak channel is a fact for the settings screen. Painting the window
    // yellow over it would be an alarm about nothing.
    expect(hostState(facts({ lessonLive: false, verdict: 'TOO_WEAK' }))).toBe('idle');
    expect(hostState(facts({ lessonLive: true, verdict: 'TOO_WEAK' }))).toBe('weak');
    expect(hostState(facts({ lessonLive: true, verdict: 'TIGHT' }))).toBe('weak');
    expect(hostState(facts({ lessonLive: true, verdict: 'WORKABLE' }))).toBe('live');
  });

  it('полоса состояния молчит, когда урока нет', () => {
    expect(showsHostBar('idle')).toBe(false);
    expect(showsHostBar('live')).toBe(true);
    expect(showsHostBar('weak')).toBe(true);
    expect(showsHostBar('offline')).toBe(true);
  });

  it('заголовок не носит пустое название урока', () => {
    expect(showsLessonTag('idle')).toBe(false);
    expect(showsLessonTag('offline')).toBe(false);
    expect(showsLessonTag('live')).toBe(true);
    expect(showsLessonTag('weak')).toBe(true);
  });

  it('без сети переключать нечего', () => {
    expect(showsSwitchers('offline')).toBe(false);
    expect(showsSwitchers('live')).toBe(true);
  });
});

describe('связь словами (решение владельца 14.08)', () => {
  it('никогда не возвращает число', () => {
    // The whole decision in one assertion: a teacher needs a decision, not telemetry.
    for (const verdict of UPLINK_VERDICTS) {
      for (const online of [true, false]) {
        expect(connectionWord({ online, verdict })).toMatch(/^(good|weak|none|unmeasured)$/);
      }
    }
  });

  it('измеримое — хорошее или слабое, неизмеренное — своё слово', () => {
    expect(connectionWord({ online: true, verdict: 'COMFORTABLE' })).toBe('good');
    expect(connectionWord({ online: true, verdict: 'WORKABLE' })).toBe('good');
    expect(connectionWord({ online: true, verdict: 'TIGHT' })).toBe('weak');
    expect(connectionWord({ online: true, verdict: 'TOO_WEAK' })).toBe('weak');
    expect(connectionWord({ online: false, verdict: 'COMFORTABLE' })).toBe('none');
  });

  it('никогда не называет неизмеренный канал хорошим', () => {
    // Saying «хорошая» about a channel nobody measured is the frame telling the teacher
    // something it does not know. D2 is where the measurement gets taken.
    expect(connectionWord({ online: true, verdict: 'UNKNOWN' })).toBe('unmeasured');
    expect(meterLevel({ online: true, verdict: 'UNKNOWN' })).toBe(0);
  });

  it('шкала падает вместе со словом', () => {
    expect(meterLevel({ online: true, verdict: 'COMFORTABLE' })).toBe(4);
    expect(meterLevel({ online: true, verdict: 'WORKABLE' })).toBe(3);
    expect(meterLevel({ online: true, verdict: 'TIGHT' })).toBe(2);
    expect(meterLevel({ online: true, verdict: 'TOO_WEAK' })).toBe(1);
    expect(meterLevel({ online: false, verdict: 'COMFORTABLE' })).toBe(0);
  });
});
