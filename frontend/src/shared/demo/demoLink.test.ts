import { execute, gql } from '@apollo/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { IDS, PROFILE_IDS, resetDemoStore } from './demoData';
import { demoLink } from './demoLink';
import { resolveDemoOperation } from './resolveDemoOperation';

function setRole(role: string) {
  window.history.replaceState({}, '', `/?role=${role}`);
}

afterEach(() => {
  window.history.replaceState({}, '', '/');
  resetDemoStore();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('resolveDemoOperation — Me is the role linchpin', () => {
  it.each([
    ['student', 'STUDENT'],
    ['teacher', 'TEACHER'],
    ['parent', 'PARENT'],
    ['admin', 'ADMIN'],
  ])('?role=%s → me.role %s', (role, expected) => {
    setRole(role);
    const data = resolveDemoOperation('Me', {}) as { me?: { role?: string } };
    expect(data.me?.role).toBe(expected);
  });

  it('defaults to TEACHER when ?role is absent/invalid', () => {
    window.history.replaceState({}, '', '/?role=bogus');
    expect((resolveDemoOperation('Me', {}) as { me?: { role?: string } }).me?.role).toBe('TEACHER');
  });

  it('parent Me carries a non-empty children roster', () => {
    setRole('parent');
    const data = resolveDemoOperation('Me', {}) as {
      me?: { parentProfile?: { children?: unknown[] } };
    };
    expect(data.me?.parentProfile?.children?.length).toBeGreaterThan(0);
  });
});

describe('resolveDemoOperation — screens render their populated (non-empty) state', () => {
  it('Catalog returns nodes, each with a non-null owner.user (no crash)', () => {
    const d = resolveDemoOperation('Catalog', {}) as {
      catalog: { nodes: { owner: { user: { firstName: string } } }[] };
    };
    expect(d.catalog.nodes.length).toBeGreaterThan(0);
    for (const n of d.catalog.nodes) expect(n.owner.user.firstName).toBeTruthy();
  });

  it('MySchedule includes a LIVE session with a lesson title', () => {
    const d = resolveDemoOperation('MySchedule', {}) as {
      mySchedule: { status: string; lesson: { title: string } }[];
    };
    expect(d.mySchedule.some((s) => s.status === 'LIVE')).toBe(true);
    expect(d.mySchedule.every((s) => s.lesson.title.length > 0)).toBe(true);
  });

  it('MySubmissions and LessonHomework (with submissionStats) are non-empty', () => {
    const subs = resolveDemoOperation('MySubmissions', {}) as { mySubmissions: unknown[] };
    expect(subs.mySubmissions.length).toBeGreaterThan(0);
    const hw = resolveDemoOperation('LessonHomework', {}) as {
      lessonHomework: { submissionStats: { total: number } }[];
    };
    expect(hw.lessonHomework[0].submissionStats.total).toBeGreaterThan(0);
  });

  it('AdminInstitution resolves a non-null institution (else the page collapses)', () => {
    const d = resolveDemoOperation('AdminInstitution', {}) as {
      me?: { adminProfile?: { institution?: { name?: string } } };
    };
    expect(d.me?.adminProfile?.institution?.name).toBe('Гимназия №1');
  });
});

describe('resolveDemoOperation — mutations succeed and update the store optimistically', () => {
  it('AddChild appends to the parent roster that Me then reflects', () => {
    setRole('parent');
    const before = (
      resolveDemoOperation('Me', {}) as { me: { parentProfile: { children: unknown[] } } }
    ).me.parentProfile.children.length;
    const res = resolveDemoOperation('AddChild', {
      input: { firstName: 'Кира', lastName: 'Иванова', consent152fz: true, gradeLevel: '2 класс' },
    }) as { addChild: { child: { firstName: string } } };
    expect(res.addChild.child.firstName).toBe('Кира');
    const after = (
      resolveDemoOperation('Me', {}) as { me: { parentProfile: { children: unknown[] } } }
    ).me.parentProfile.children.length;
    expect(after).toBe(before + 1);
  });

  it('ReportAttention is a no-op success (no biometrics leave the device)', () => {
    expect(resolveDemoOperation('ReportAttention', { input: {} })).toEqual({
      reportAttention: true,
    });
  });
});

describe('demoLink — terminates in the browser with ZERO network', () => {
  it('resolves a query to { data } without ever calling fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.useFakeTimers();

    let result: { data?: { me?: { id?: string } } } | undefined;
    execute(demoLink, {
      query: gql`
        query Me {
          me {
            id
            role
          }
        }
      `,
    }).subscribe((r) => {
      result = r as typeof result;
    });
    await vi.advanceTimersByTimeAsync(100);

    expect(result?.data?.me?.id).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('AttentionUpdates emits synthetic aggregate ticks on an interval', async () => {
    vi.useFakeTimers();
    const seen: number[] = [];
    const sub = execute(demoLink, {
      query: gql`
        subscription AttentionUpdates($sessionId: ID!) {
          attentionUpdates {
            avgAttention
          }
        }
      `,
      variables: { sessionId: 'ses-algebra-live' },
    }).subscribe((r) => {
      const v = (r as { data?: { attentionUpdates?: { avgAttention?: number } } }).data
        ?.attentionUpdates?.avgAttention;
      if (typeof v === 'number') seen.push(v);
    });

    await vi.advanceTimersByTimeAsync(5_000);
    sub.unsubscribe();
    expect(seen.length).toBeGreaterThanOrEqual(2);
    for (const v of seen) expect(v).toBeGreaterThanOrEqual(0);
  });
});

describe('resolveDemoOperation — learning profiles (R0.2)', () => {
  type Profile = {
    id: string;
    kind: string;
    groupName: string | null;
    courseTitle: string | null;
    isActive: boolean;
  };
  const profiles = () =>
    (resolveDemoOperation('LearningProfiles', {}) as { learningProfiles: Profile[] })
      .learningProfiles;

  it('a schoolchild holds both educations, exactly one of them active', () => {
    setRole('student');
    const list = profiles();
    expect(list.map((p) => p.kind)).toEqual(['PUPIL', 'CADET']);
    expect(list[0].groupName).toBe('9А'); // atlas sheet 00: "Ученик · 9А"
    expect(list[1].courseTitle).toBe('English A2');
    expect(list.filter((p) => p.isActive)).toHaveLength(1);
  });

  it('the profile carries data, not display text — the UI composes the label', () => {
    setRole('student');
    // "Ученик"/"Курсант" must come from i18n, never from the payload.
    expect(JSON.stringify(profiles())).not.toMatch(/Ученик|Курсант/);
  });

  it('switching moves the active marker and sticks', () => {
    setRole('student');
    const cadetId = profiles()[1].id;
    resolveDemoOperation('SetActiveLearningProfile', { id: cadetId });

    const after = profiles();
    expect(after.find((p) => p.isActive)?.id).toBe(cadetId);
    expect(after.filter((p) => p.isActive)).toHaveLength(1);
  });

  it('a teacher has a teaching profile; a parent has none', () => {
    setRole('teacher');
    expect(profiles().map((p) => p.kind)).toEqual(['TEACHER']);
    setRole('parent');
    expect(profiles()).toEqual([]);
  });
});

describe('resolveDemoOperation — start page (R0.4)', () => {
  type Page = {
    profile: { kind: string } | null;
    now: { kind: string; title: string } | null;
    today: unknown[];
    attention: { kind: string; count: number | null }[];
    week: { isToday: boolean; entries: unknown[] }[];
    progress: unknown[];
  };
  const page = () => (resolveDemoOperation('StartPage', {}) as { startPage: Page }).startPage;

  it('pupil: a lesson to walk into, a week of seven days with today marked', () => {
    setRole('student');
    const data = page();
    expect(data.profile?.kind).toBe('PUPIL');
    expect(data.now?.kind).toBe('LESSON_SESSION');
    expect(data.today.length).toBeGreaterThan(0);
    expect(data.week).toHaveLength(7);
    expect(data.week.filter((d) => d.isToday)).toHaveLength(1);
  });

  it('teacher: a grading queue instead of personal progress', () => {
    setRole('teacher');
    const data = page();
    expect(data.profile?.kind).toBe('TEACHER');
    expect(data.attention[0].kind).toBe('GRADING_QUEUE');
    expect(data.attention[0].count).toBe(11);
    expect(data.progress).toEqual([]);
  });

  it('every row carries the full StartEntry selection (else Apollo reports missing fields)', () => {
    // The document asks for the widest set on `now`; a row reused in `today`/`attention`
    // must satisfy it too, or the preview logs "missing field" for each render.
    const required = [
      'id',
      'kind',
      'title',
      'courseTitle',
      'teacherName',
      'at',
      'count',
      'ageDays',
      'sessionId',
      'lessonId',
      'courseId',
      'isLive',
    ];
    for (const role of ['student', 'teacher']) {
      setRole(role);
      const data = resolveDemoOperation('StartPage', {}) as {
        startPage: { now: object | null; today: object[]; attention: object[] };
      };
      const rows = [data.startPage.now, ...data.startPage.today, ...data.startPage.attention];
      for (const row of rows.filter(Boolean) as Record<string, unknown>[]) {
        expect(Object.keys(row).sort()).toEqual(expect.arrayContaining(required.sort()));
      }
    }
  });

  it('switching to the cadet profile re-scopes the page — no timetable, something to resume', () => {
    setRole('student');
    resolveDemoOperation('SetActiveLearningProfile', { id: PROFILE_IDS.cadet });
    const data = page();
    expect(data.profile?.kind).toBe('CADET');
    expect(data.today).toEqual([]);
    expect(data.now?.kind).toBe('CONTINUE_LESSON');
    // The week is empty rather than invented: spaced repetition arrives in R4.4.
    expect(data.week.every((d) => d.entries.length === 0)).toBe(true);
  });
});

describe('resolveDemoOperation — subject cabinet (R1.1)', () => {
  type Material = { id: string; savedId: string | null; note: string | null; title: string };
  type Cabinet = {
    title: string;
    profileKind: string;
    progressPct: number;
    studentCount: number | null;
    sections: { doneLessons: number; totalLessons: number; lessons: Record<string, unknown>[] }[];
    materials: Material[];
    savedMaterials: Material[];
    sources: { inLesson: boolean; savedId: string | null; url: string | null }[];
    nextLesson: { id: string } | null;
  };
  const cabinet = (courseId = IDS.course.algebra) =>
    (resolveDemoOperation('SubjectCabinet', { courseId }) as { subjectCabinet: Cabinet })
      .subjectCabinet;

  it('every lesson carries the full SubjectLesson selection (else Apollo reports missing fields)', () => {
    const required = [
      'id',
      'title',
      'subtitle',
      'progress',
      'kind',
      'deviceKey',
      'orderLabel',
      'materialCount',
      'hasHomework',
      'sessionId',
      'sessionAt',
      'isLive',
      'grade',
      'completedBy',
      'groupSize',
    ];
    for (const role of ['student', 'teacher']) {
      setRole(role);
      const data = cabinet();
      const rows = [...data.sections.flatMap((s) => s.lessons), data.nextLesson].filter(
        Boolean,
      ) as Record<string, unknown>[];
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(Object.keys(row).sort()).toEqual(expect.arrayContaining(required.sort()));
      }
    }
  });

  it('pupil: a programme with a lesson going on and one on an external device', () => {
    setRole('student');
    const data = cabinet();
    expect(data.profileKind).toBe('PUPIL');
    expect(data.sections[0].lessons.some((l) => l.progress === 'CURRENT')).toBe(true);
    const device = data.sections[0].lessons.find((l) => l.kind === 'EXTERNAL_DEVICE');
    expect(device?.deviceKey).toBe('microobservatory');
  });

  it('teacher: the same programme with group numbers, never a per-pupil list', () => {
    setRole('teacher');
    const data = cabinet();
    expect(data.profileKind).toBe('TEACHER');
    expect(data.studentCount).toBe(24);
    const rows = data.sections.flatMap((s) => s.lessons);
    expect(rows.some((l) => l.groupSize === 24)).toBe(true);
    expect(rows.every((l) => !('students' in l))).toBe(true);
  });

  it('the kind comes from the course, the way the server derives it', () => {
    // A course with an institution is a school subject; a standalone one is self-paced.
    setRole('student');
    expect(cabinet(IDS.course.algebra).profileKind).toBe('PUPIL');
    expect(cabinet(IDS.course.english).profileKind).toBe('CADET');
    expect(cabinet(IDS.course.english).title).toContain('English');
    setRole('teacher');
    expect(cabinet(IDS.course.english).profileKind).toBe('TEACHER');
  });

  it('the quiet corner moves a material into «мои сохранённые» and back', () => {
    setRole('student');
    const before = cabinet();
    const target = before.materials[0];
    expect(before.savedMaterials.some((m) => m.id === target.id)).toBe(false);

    const saved = resolveDemoOperation('SaveItem', {
      input: { courseId: IDS.course.algebra, materialId: target.id, note: 'для лабораторной' },
    }) as { saveItem: { savedId: string } };

    const after = cabinet();
    const kept = after.savedMaterials.find((m) => m.id === target.id);
    expect(kept?.savedId).toBe(saved.saveItem.savedId);
    expect(kept?.note).toBe('для лабораторной');
    // The teacher block still holds it — the two blocks are views, not a move.
    expect(after.materials.some((m) => m.id === target.id)).toBe(true);

    resolveDemoOperation('RemoveSavedItem', { id: saved.saveItem.savedId });
    expect(cabinet().savedMaterials.some((m) => m.id === target.id)).toBe(false);
  });

  it('a source kept from the rail keeps only a link, and shows up as a personal find', () => {
    setRole('student');
    const src = cabinet().sources[0];
    resolveDemoOperation('SaveItem', {
      input: { courseId: IDS.course.algebra, title: src.url, url: src.url, sourceName: 'NASA' },
    });

    const after = cabinet();
    expect(after.sources[0].savedId).not.toBeNull();
    const kept = after.savedMaterials.find((m) => m.title === src.url);
    expect(kept).toBeDefined();
  });

  it('the rail splits sources into «в уроке» and recommendations, and invents neither', () => {
    setRole('student');
    const data = cabinet();
    expect(data.sources.length).toBeGreaterThan(0);
    expect(data.sources.every((s) => s.inLesson)).toBe(true);
  });
});

describe('resolveDemoOperation — tasks, progress and the edit mode (R1.2)', () => {
  type Task = {
    state: string;
    score: number | null;
    attempts: number;
    redoOpen: boolean;
    groupSize: number | null;
  };
  type Topic = {
    title: string;
    pct: number | null;
    previousPct: number | null;
    weakCount: number | null;
  };
  const tasks = (courseId = IDS.course.algebra) =>
    (resolveDemoOperation('SubjectTasks', { courseId }) as { subjectTasks: Task[] }).subjectTasks;
  const progress = (courseId = IDS.course.algebra) =>
    (
      resolveDemoOperation('SubjectProgress', { courseId }) as {
        subjectProgress: {
          topics: Topic[];
          overallPct: number | null;
          previousOverallPct: number | null;
        };
      }
    ).subjectProgress;

  it('every task carries the full SubjectTask selection (else Apollo reports missing fields)', () => {
    const required = [
      'id',
      'title',
      'lessonId',
      'lessonLabel',
      'dueAt',
      'state',
      'submittedAt',
      'score',
      'comment',
      'attempts',
      'redoOpen',
      'submittedBy',
      'groupSize',
      'gradedCount',
      'waitingCount',
      'staleCount',
      'retakeCount',
    ];
    for (const role of ['student', 'teacher']) {
      setRole(role);
      for (const row of tasks() as unknown as Record<string, unknown>[]) {
        expect(Object.keys(row).sort()).toEqual(expect.arrayContaining(required.sort()));
      }
    }
  });

  it('every topic carries the full SubjectTopic selection', () => {
    const required = [
      'id',
      'title',
      'lessonFrom',
      'lessonTo',
      'isCurrent',
      'pct',
      'previousPct',
      'weakCount',
      'learnerCount',
    ];
    for (const role of ['student', 'teacher']) {
      setRole(role);
      for (const row of progress().topics as unknown as Record<string, unknown>[]) {
        expect(Object.keys(row).sort()).toEqual(expect.arrayContaining(required.sort()));
      }
    }
  });

  it('pupil: an open retake shows the new mark; teacher: the same work as counts', () => {
    setRole('student');
    const retake = tasks().find((t) => t.redoOpen);
    expect(retake?.score).not.toBeNull();
    expect(tasks().every((t) => t.groupSize === null)).toBe(true);

    setRole('teacher');
    expect(tasks().every((t) => t.groupSize === 24)).toBe(true);
    expect(tasks().every((t) => t.score === null)).toBe(true);
  });

  it('a learner gets a self-comparison; a teacher never does', () => {
    setRole('student');
    expect(progress().previousOverallPct).toBe(55);
    expect(progress().topics.some((t) => t.weakCount !== null)).toBe(false);

    setRole('teacher');
    expect(progress().previousOverallPct).toBeNull();
    expect(progress().topics.some((t) => (t.weakCount ?? 0) > 0)).toBe(true);
  });

  it('a topic nobody has been marked on stays blank rather than zero', () => {
    setRole('student');
    expect(progress().topics.at(-1)?.pct).toBeNull();
  });

  it('the edit mode sticks: a reorder, a rename and an added lesson survive the next read', () => {
    setRole('teacher');
    const cabinet = () =>
      (
        resolveDemoOperation('SubjectCabinet', { courseId: IDS.course.algebra }) as {
          subjectCabinet: {
            sections: {
              id: string;
              lessons: { id: string; title: string; orderLabel: string }[];
            }[];
          };
        }
      ).subjectCabinet;

    const section = cabinet().sections[0];
    const ids = section.lessons.map((l) => l.id);
    const swapped = [ids[1], ids[0], ...ids.slice(2)];
    resolveDemoOperation('ReorderLessons', { sectionId: section.id, orderedIds: swapped });
    expect(
      cabinet()
        .sections[0].lessons.map((l) => l.id)
        .slice(0, 2),
    ).toEqual([ids[1], ids[0]]);
    // The programme renumbers rather than carrying the old positions around.
    expect(
      cabinet()
        .sections[0].lessons.map((l) => l.orderLabel)
        .slice(0, 3),
    ).toEqual(['1', '2', '3']);

    resolveDemoOperation('UpdateLesson', { id: ids[0], input: { title: 'Переименован' } });
    expect(cabinet().sections[0].lessons.find((l) => l.id === ids[0])?.title).toBe('Переименован');

    resolveDemoOperation('CreateLesson', {
      sectionId: section.id,
      input: { title: 'Новый урок', kind: 'EXTERNAL_DEVICE', deviceKey: 'microobservatory' },
    });
    expect(cabinet().sections[0].lessons.some((l) => l.title === 'Новый урок')).toBe(true);

    resolveDemoOperation('DeleteLesson', { id: ids[1] });
    expect(cabinet().sections[0].lessons.some((l) => l.id === ids[1])).toBe(false);
  });

  it("the rail's lesson agrees with the programme (one entity, one ordinal)", () => {
    // Apollo normalises by id: two copies of a lesson with different ordinals would let the
    // last write win, and a row would show a stale number after a reorder.
    setRole('teacher');
    const cabinet = () =>
      (
        resolveDemoOperation('SubjectCabinet', { courseId: IDS.course.algebra }) as {
          subjectCabinet: {
            sections: { id: string; lessons: { id: string; orderLabel: string }[] }[];
            nextLesson: { id: string; orderLabel: string } | null;
          };
        }
      ).subjectCabinet;

    const next = cabinet().nextLesson;
    const inProgramme = cabinet()
      .sections.flatMap((s) => s.lessons)
      .find((l) => l.id === next?.id);
    expect(next?.orderLabel).toBe(inProgramme?.orderLabel);

    const section = cabinet().sections[0];
    const ids = section.lessons.map((l) => l.id);
    resolveDemoOperation('ReorderLessons', {
      sectionId: section.id,
      orderedIds: [ids[2], ...ids.filter((_, i) => i !== 2)],
    });
    const moved = cabinet().nextLesson;
    const movedInProgramme = cabinet()
      .sections.flatMap((s) => s.lessons)
      .find((l) => l.id === moved?.id);
    expect(moved?.orderLabel).toBe(movedInProgramme?.orderLabel);
  });

  it('the order label is a bare ordinal — the client words «Урок N»', () => {
    setRole('student');
    const cabinet = resolveDemoOperation('SubjectCabinet', { courseId: IDS.course.algebra }) as {
      subjectCabinet: { sections: { lessons: { orderLabel: string }[] }[] };
    };
    for (const section of cabinet.subjectCabinet.sections) {
      for (const lesson of section.lessons) expect(lesson.orderLabel).toMatch(/^\d+$/);
    }
  });
});

describe('resolveDemoOperation — chat (R2)', () => {
  type Channel = {
    id: string;
    kind: string;
    unread: number;
    lastMessageText: string | null;
    openReports: number;
    participants: unknown[];
  };
  const channels = () =>
    (resolveDemoOperation('MyChannels', {}) as { myChannels: Channel[] }).myChannels;
  const messages = (channelId: string) =>
    (
      resolveDemoOperation('ChannelMessages', { channelId }) as {
        channelMessages: { text: string; mine: boolean }[];
      }
    ).channelMessages;

  it('every channel carries the full MyChannels selection (else Apollo reports missing fields)', () => {
    const required = [
      'id',
      'kind',
      'courseId',
      'courseTitle',
      'groupName',
      'institutionName',
      'unread',
      'lastMessageAt',
      'lastMessageText',
      'readOnly',
      'openReports',
      'participants',
    ];
    for (const role of ['student', 'teacher']) {
      setRole(role);
      const rows = channels() as unknown as Record<string, unknown>[];
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(Object.keys(row).sort()).toEqual(expect.arrayContaining(required.sort()));
      }
    }
  });

  it('a pupil gets the subject room, the teacher and a classmate; a teacher gets the staff room', () => {
    setRole('student');
    expect(
      channels()
        .map((c) => c.kind)
        .sort(),
    ).toEqual(['PEER', 'PUPIL_TEACHER', 'SUBJECT_GROUP']);
    setRole('teacher');
    expect(channels().map((c) => c.kind)).toContain('STAFF_ROOM');
    // A teacher has no pupil↔pupil channel of their own — those are not theirs to be in.
    expect(channels().map((c) => c.kind)).not.toContain('PEER');
  });

  it('the header count is the sum of the unread channels', () => {
    setRole('student');
    const total = (resolveDemoOperation('ChatUnread', {}) as { chatUnread: number }).chatUnread;
    expect(total).toBe(channels().reduce((sum, c) => sum + c.unread, 0));
    expect(total).toBeGreaterThan(0);
  });

  it('sending a message keeps it, and reading a channel clears its badge', () => {
    setRole('student');
    const before = messages('ch-vera').length;
    resolveDemoOperation('SendChannelMessage', { channelId: 'ch-vera', text: 'сейчас' });

    const after = messages('ch-vera');
    expect(after).toHaveLength(before + 1);
    expect(after.at(-1)).toMatchObject({ text: 'сейчас', mine: true });

    resolveDemoOperation('MarkChannelRead', { channelId: 'ch-astro' });
    expect(channels().find((c) => c.id === 'ch-astro')?.unread).toBe(0);
  });

  it('a complaint shows up on the channel it was filed against', () => {
    setRole('student');
    expect(channels().find((c) => c.id === 'ch-vera')?.openReports).toBe(0);
    resolveDemoOperation('ReportChannel', { channelId: 'ch-vera', reason: 'грубит' });
    expect(channels().find((c) => c.id === 'ch-vera')?.openReports).toBe(1);
  });

  it('the preview policy matches the matrix for a RU tenant', () => {
    setRole('student');
    const policy = (
      resolveDemoOperation('ChatPolicy', {}) as {
        chatPolicy: { peerChat: boolean; teacherVisibleAlways: boolean; premoderation: boolean };
      }
    ).chatPolicy;
    expect(policy.peerChat).toBe(true);
    // The base mode: nothing stricter is on unless an institution switches it on.
    expect(policy.teacherVisibleAlways).toBe(false);
    expect(policy.premoderation).toBe(false);
  });
});
