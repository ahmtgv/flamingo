import { describe, expect, it } from 'vitest';

import { arrivalState, availableWithoutHost } from './arrival';

type View = Parameters<typeof arrivalState>[0];

const view = (over: Partial<View> = {}): View =>
  ({
    __typename: 'MeetingPointView',
    slug: 'english-a2',
    decision: 'ALLOWED',
    groupName: 'Четверг 18:00',
    teacherName: 'Люция Валерьевна',
    hostOnline: true,
    nextLesson: {
      __typename: 'UpcomingLesson',
      sessionId: 's1',
      title: 'Unit 4 — Travel',
      startAt: new Date(Date.now() + 12 * 60_000).toISOString(),
      isLive: false,
    },
    capabilities: {
      __typename: 'OfflineCapabilities',
      schedule: true,
      chat: true,
      homework: true,
      myWork: true,
      myGrades: true,
      mySummaries: true,
      myDiary: true,
      myBoards: true,
      myMaterials: true,
      lessonMaterials: false,
      liveBoard: false,
      room: false,
    },
    ...over,
  }) as View;

describe('приход ученика — пять состояний листа D3', () => {
  it('до начала — ожидание с расписанием', () => {
    expect(arrivalState(view())).toBe('waiting');
  });

  it('занятие идёт — заходите', () => {
    expect(
      arrivalState(view({ nextLesson: { ...view().nextLesson!, isLive: true } })),
    ).toBe('live');
  });

  it('🔴 преподавателя нет в сети — штатное состояние, а не поломка', () => {
    expect(arrivalState(view({ hostOnline: false }))).toBe('host_offline');
  });

  it('занятие закончилось', () => {
    expect(arrivalState(view({ nextLesson: null }))).toBe('finished');
  });

  it('ссылка заменена', () => {
    expect(arrivalState(view({ decision: 'LINK_REPLACED' }))).toBe('link_replaced');
  });
});

describe('порядок проверок — это решение, а не случайность', () => {
  it('мёртвая ссылка сильнее идущего занятия', () => {
    // Нельзя сперва сказать «идёт занятие», а потом отобрать.
    expect(
      arrivalState(
        view({ decision: 'LINK_REPLACED', nextLesson: { ...view().nextLesson!, isLive: true } }),
      ),
    ).toBe('link_replaced');
  });

  it('постороннему не показывают, что происходит внутри — даже одним словом', () => {
    expect(
      arrivalState(
        view({ decision: 'NOT_IN_GROUP', nextLesson: { ...view().nextLesson!, isLive: true } }),
      ),
    ).toBe('not_in_group');
  });

  it('выключенный хост сильнее расписания: «войти» не должно упираться в тишину', () => {
    expect(
      arrivalState(
        view({ hostOnline: false, nextLesson: { ...view().nextLesson!, isLive: true } }),
      ),
    ).toBe('host_offline');
  });
});

describe('что доступно без машины преподавателя', () => {
  it('🔴 своя учёба — вся, из зеркала (§20.5.1)', () => {
    const rows = availableWithoutHost(view({ hostOnline: false }));
    for (const own of ['myWork', 'myGrades', 'myDiary', 'mySummaries', 'myBoards', 'myMaterials']) {
      expect(rows, own).toContain(own);
    }
    // Домашнюю можно писать — ответ уйдёт сам; чат живёт не на его компьютере.
    expect(rows).toContain('homework');
    expect(rows).toContain('chat');
  });

  it('живая доска и методички ЭТОГО урока — единственная цена', () => {
    const caps = view().capabilities;
    expect([caps.liveBoard, caps.lessonMaterials, caps.room]).toEqual([false, false, false]);
  });

  it('список берётся у сервера, а не сочиняется экраном', () => {
    // Сервер сказал «нет» — экран обязан согласиться, иначе соврёт про то, зря ли ждали.
    const rows = availableWithoutHost(
      view({ capabilities: { ...view().capabilities, myWork: false, chat: false } }),
    );
    expect(rows).not.toContain('myWork');
    expect(rows).not.toContain('chat');
  });
});
