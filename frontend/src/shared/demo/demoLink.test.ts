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
