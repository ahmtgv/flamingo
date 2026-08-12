import { execute, gql } from '@apollo/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { resetDemoStore } from './demoData';
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
    const data = resolveDemoOperation('Me', {}) as { me?: { parentProfile?: { children?: unknown[] } } };
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
    const before = (resolveDemoOperation('Me', {}) as { me: { parentProfile: { children: unknown[] } } }).me
      .parentProfile.children.length;
    const res = resolveDemoOperation('AddChild', {
      input: { firstName: 'Кира', lastName: 'Иванова', consent152fz: true, gradeLevel: '2 класс' },
    }) as { addChild: { child: { firstName: string } } };
    expect(res.addChild.child.firstName).toBe('Кира');
    const after = (resolveDemoOperation('Me', {}) as { me: { parentProfile: { children: unknown[] } } }).me
      .parentProfile.children.length;
    expect(after).toBe(before + 1);
  });

  it('ReportAttention is a no-op success (no biometrics leave the device)', () => {
    expect(resolveDemoOperation('ReportAttention', { input: {} })).toEqual({ reportAttention: true });
  });
});

describe('demoLink — terminates in the browser with ZERO network', () => {
  it('resolves a query to { data } without ever calling fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.useFakeTimers();

    let result: { data?: { me?: { id?: string } } } | undefined;
    execute(demoLink, { query: gql`query Me { me { id role } }` }).subscribe((r) => {
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
      query: gql`subscription AttentionUpdates($sessionId: ID!) { attentionUpdates { avgAttention } }`,
      variables: { sessionId: 'ses-algebra-live' },
    }).subscribe((r) => {
      const v = (r as { data?: { attentionUpdates?: { avgAttention?: number } } }).data?.attentionUpdates
        ?.avgAttention;
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
