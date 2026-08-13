import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Owner decision Р5.1 (2026-08-13): **a student sees the teacher and their own preview.**
 *
 * The reason is the teacher's uplink, not taste — the lesson is hosted from their machine,
 * and «everyone sees everyone» costs 30 Mbit/s outbound at eight pupils against 4.3 for this
 * mode (`docs/handoff/R5_DESKTOP_HOST_BUDGET.md` §3). A decision with a number behind it is
 * exactly the kind that gets quietly undone by a later refactor «simplifying» a filter away,
 * so it gets a test that reads the code rather than the screen.
 */

const here = dirname(fileURLToPath(import.meta.url));
const read = (name: string) => readFileSync(join(here, name), 'utf8');

describe('Р5.1 — the student strip is the teacher plus themselves', () => {
  it('the real room hands VideoRoom a filtered participant list, not everyone', () => {
    const source = read('LiveRoomScreen.tsx');
    // The filter exists...
    expect(source).toMatch(/teacherOnly\s*=\s*useMemo/);
    expect(source).toMatch(/p\.identity === teacherId/);
    // ...and it is what the student's strip actually receives. StudentRoom is declared
    // before TeacherRoom, so the slice has to END at the teacher's — reading to end of file
    // would swallow the teacher's own (correct) full list and pass for the wrong reason.
    const studentBlock = source.slice(
      source.indexOf('function StudentRoom'),
      source.indexOf('function TeacherRoom'),
    );
    expect(studentBlock).toContain('participants={teacherOnly}');
    expect(studentBlock).not.toContain('participants={lk.participants}');
  });

  it('the teacher still sees the whole group', () => {
    const source = read('LiveRoomScreen.tsx');
    const teacherBlock = source.slice(source.indexOf('function TeacherRoom'));
    expect(teacherBlock).toContain('participants={lk.participants}');
  });

  it('the preview shows the same two tiles, because a showcase that lies is worse than none', () => {
    const source = read('PreviewRoom.tsx');
    const studentBlock = source.slice(source.indexOf('function StudentPreview'));
    expect(studentBlock).toContain('data-count={2}');
    expect(studentBlock).not.toMatch(/classmates\.map/);
  });

  it('the pupil is told why the class is not on screen, not left to wonder', () => {
    const strings = JSON.parse(read('../../../i18n/locales/ru/lesson.json'));
    expect(strings.strip.classmatesHidden).toMatch(/одноклассников не видно/);
    expect(read('LiveRoomScreen.tsx')).toContain("t('lesson:strip.classmatesHidden')");
    expect(read('PreviewRoom.tsx')).toContain("t('lesson:strip.classmatesHidden')");
  });
});
