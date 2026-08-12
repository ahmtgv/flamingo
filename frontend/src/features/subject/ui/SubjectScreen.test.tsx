import { type MockedResponse } from '@apollo/client/testing';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GraphQLError } from 'graphql';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import {
  SaveItemDocument,
  SubjectCabinetDocument,
  type SubjectCabinetQuery,
  SubjectTasksDocument,
} from '@/entities/graphql/generated';
import { renderWithProviders } from '@/test/renderWithProviders';

import { SubjectScreen } from './SubjectScreen';

const COURSE = 'c-astro';

type Cabinet = SubjectCabinetQuery['subjectCabinet'];
type Lesson = Cabinet['sections'][number]['lessons'][number];
type Material = Cabinet['materials'][number];
type Source = Cabinet['sources'][number];

const lesson = (
  over: Partial<Lesson> & {
    id: string;
    title: string;
    orderLabel: string;
    progress: Lesson['progress'];
  },
): Lesson => ({
  __typename: 'SubjectLesson',
  subtitle: null,
  kind: 'STANDARD',
  deviceKey: null,
  materialCount: 0,
  hasHomework: false,
  sessionId: null,
  sessionAt: null,
  isLive: false,
  grade: null,
  completedBy: null,
  groupSize: null,
  ...over,
});

const material = (over: Partial<Material> & { id: string; title: string }): Material => ({
  __typename: 'SubjectMaterial',
  subtitle: null,
  type: 'LINK',
  url: 'https://example.org/a',
  fromLabel: null,
  lessonId: null,
  savedId: null,
  note: null,
  savedKind: null,
  ...over,
});

const source = (
  over: Partial<Source> & { id: string; name: string; sourceName: string },
): Source => ({
  __typename: 'SubjectSource',
  url: 'https://example.org/s',
  note: null,
  inLesson: true,
  savedId: null,
  ...over,
});

const DONE = lesson({
  id: 'l10',
  title: 'Как ищут планеты',
  orderLabel: '10',
  progress: 'DONE',
  grade: 5,
});
const CURRENT = lesson({
  id: 'l12',
  title: 'Экзопланеты',
  orderLabel: '12',
  subtitle: 'Горячие юпитеры',
  progress: 'CURRENT',
  materialCount: 2,
  hasHomework: true,
  sessionId: 's1',
  sessionAt: new Date().toISOString(),
  isLive: true,
});
const DEVICE = lesson({
  id: 'l14',
  title: 'Своё наблюдение',
  orderLabel: '14',
  progress: 'AHEAD',
  kind: 'EXTERNAL_DEVICE',
  deviceKey: 'microobservatory',
});

const TEACHER_MATERIAL = material({
  id: 'm1',
  title: 'NASA Exoplanet Archive',
  fromLabel: 'учитель · задание урока',
});
const MY_MATERIAL = material({
  id: 'm9',
  title: 'Met Open Access · снимки телескопов',
  fromLabel: 'найдено самостоятельно',
  savedId: 'sv-9',
  note: 'взять массу и период',
  savedKind: 'SAVED',
});

function cabinet(over: Partial<Cabinet> = {}): SubjectCabinetQuery {
  return {
    __typename: 'Query',
    subjectCabinet: {
      __typename: 'SubjectCabinet',
      courseId: COURSE,
      title: 'Астрономия',
      profileKind: 'PUPIL',
      institutionName: 'Гимназия №1',
      groupName: '9А',
      teacherName: 'Мария Петровна',
      teacherId: 'u-maria',
      lessonCount: 34,
      studentCount: null,
      progressPct: 62,
      sections: [
        {
          __typename: 'SubjectSection',
          id: 'sec2',
          title: 'Раздел 2 · Планетные системы',
          doneLessons: 6,
          totalLessons: 8,
          lessons: [DONE, CURRENT, DEVICE],
        },
      ],
      materials: [TEACHER_MATERIAL],
      savedMaterials: [MY_MATERIAL],
      sources: [source({ id: 'sr1', name: 'NASA Live', sourceName: 'NASA', inLesson: true })],
      nextLesson: CURRENT,
      ...over,
    } as Cabinet,
  };
}

const cabinetMock = (data: SubjectCabinetQuery): MockedResponse => ({
  request: { query: SubjectCabinetDocument, variables: { courseId: COURSE } },
  result: { data },
});

const render = (mocks: MockedResponse[]) =>
  renderWithProviders(
    <Routes>
      <Route path="/subjects/:courseId" element={<SubjectScreen />} />
    </Routes>,
    { mocks, route: `/subjects/${COURSE}` },
  );

describe('SubjectScreen — atlas sheet 01', () => {
  it('pupil: names the subject, its context and how far the programme has got', async () => {
    render([cabinetMock(cabinet())]);

    expect(await screen.findByRole('heading', { name: 'Астрономия' })).toBeInTheDocument();
    expect(screen.getByText(/9А · Гимназия №1 · Мария Петровна/)).toBeInTheDocument();
    expect(screen.getByText('62%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '62');
  });

  it('words the lesson number on the client — the server sends a bare ordinal', async () => {
    // The projection returns "10"; «Урок 10» is composed here, so the screen stays
    // translatable. A fixture carrying "Урок 10" would hide exactly this bug.
    render([cabinetMock(cabinet())]);
    await screen.findByRole('heading', { name: 'Астрономия' });

    expect(screen.getByRole('button', { name: /^Урок 10 · Как ищут планеты/ })).toBeInTheDocument();
    expect(screen.queryByText(/Урок Урок/)).not.toBeInTheDocument();
  });

  it('marks lessons пройден / идёт / впереди and shows the section tally', async () => {
    render([cabinetMock(cabinet())]);
    await screen.findByRole('heading', { name: 'Астрономия' });

    expect(screen.getByText('6 из 8 пройдено')).toBeInTheDocument();
    const done = screen.getByRole('button', { name: /Урок 10/ });
    const current = screen.getByRole('button', { name: /Урок 12/ });
    const ahead = screen.getByRole('button', { name: /Урок 14/ });
    expect(within(done).getByText('пройден')).toBeInTheDocument();
    expect(within(current).getByText('идёт сейчас')).toBeInTheDocument();
    expect(within(ahead).getByText('впереди')).toBeInTheDocument();
  });

  it('an external-device lesson stays a lesson and opens the device stub, not a device page', async () => {
    render([cabinetMock(cabinet())]);
    await screen.findByRole('heading', { name: 'Астрономия' });

    const row = screen.getByRole('button', { name: /Урок 14/ });
    expect(within(row).getByText('внешний прибор')).toBeInTheDocument();

    await userEvent.click(row);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Урок на внешнем приборе')).toBeInTheDocument();
    expect(within(dialog).getByText(/microobservatory/)).toBeInTheDocument();
  });

  it('keeps «от учителя» and «мои сохранённые» in two blocks that never mix', async () => {
    render([cabinetMock(cabinet())]);
    await screen.findByRole('heading', { name: 'Астрономия' });
    await userEvent.click(screen.getByRole('tab', { name: /Материалы/ }));

    const fromTeacher = screen.getByRole('region', { name: 'От учителя и по программе' });
    const mine = screen.getByRole('region', { name: 'Что я сохранил по этому предмету' });

    expect(within(fromTeacher).getByText('NASA Exoplanet Archive')).toBeInTheDocument();
    expect(within(fromTeacher).queryByText(/Met Open Access/)).not.toBeInTheDocument();
    expect(within(mine).getByText(/Met Open Access/)).toBeInTheDocument();
    expect(within(mine).queryByText('NASA Exoplanet Archive')).not.toBeInTheDocument();
  });

  it('a personal note stays in the personal block — the teacher block is not annotated', async () => {
    // The same material can appear in both blocks; only the personal one carries my note.
    const kept = { ...TEACHER_MATERIAL, savedId: 'sv-1', note: 'взять массу и период' };
    render([cabinetMock(cabinet({ materials: [kept], savedMaterials: [kept] }))]);
    await screen.findByRole('heading', { name: 'Астрономия' });
    await userEvent.click(screen.getByRole('tab', { name: /Материалы/ }));

    const fromTeacher = screen.getByRole('region', { name: 'От учителя и по программе' });
    const mine = screen.getByRole('region', { name: 'Что я сохранил по этому предмету' });
    expect(within(fromTeacher).queryByText('взять массу и период')).not.toBeInTheDocument();
    expect(within(mine).getByText('взять массу и период')).toBeInTheDocument();
  });

  it('the quiet corner keeps a material with a note (and never a copy of it)', async () => {
    const saveMock: MockedResponse = {
      request: {
        query: SaveItemDocument,
        variables: {
          input: {
            courseId: COURSE,
            lessonId: null,
            materialId: 'm1',
            note: 'пригодится для лабораторной',
            kind: 'SAVED',
          },
        },
      },
      result: {
        data: {
          saveItem: {
            __typename: 'SubjectMaterial',
            id: 'sv-1',
            title: 'NASA Exoplanet Archive',
            savedId: 'sv-1',
            note: 'пригодится для лабораторной',
            savedKind: 'SAVED',
          },
        },
      },
    };
    render([cabinetMock(cabinet()), saveMock, cabinetMock(cabinet())]);
    await screen.findByRole('heading', { name: 'Астрономия' });
    await userEvent.click(screen.getByRole('tab', { name: /Материалы/ }));

    const fromTeacher = screen.getByRole('region', { name: 'От учителя и по программе' });
    await userEvent.click(within(fromTeacher).getByRole('button', { name: 'Действия' }));
    await userEvent.click(screen.getByRole('menuitem', { name: /В мои материалы/ }));
    await userEvent.type(screen.getByLabelText('Зачем сохраняю'), 'пригодится для лабораторной');
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    // The mutation carries a reference (materialId) and a note — no content travels with it.
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it('«поделиться» hands over the link, not a copy', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render([cabinetMock(cabinet())]);
    await screen.findByRole('heading', { name: 'Астрономия' });
    await userEvent.click(screen.getByRole('tab', { name: /Материалы/ }));

    const fromTeacher = screen.getByRole('region', { name: 'От учителя и по программе' });
    await userEvent.click(within(fromTeacher).getByRole('button', { name: 'Действия' }));
    await userEvent.click(screen.getByRole('menuitem', { name: /Поделиться/ }));

    expect(writeText).toHaveBeenCalledWith('https://example.org/a');
    expect(await screen.findByText('Ссылка скопирована')).toBeInTheDocument();
  });

  it('the rail carries ближайшее действие · кто ведёт · источники in two zones', async () => {
    render([cabinetMock(cabinet())]);
    await screen.findByRole('heading', { name: 'Астрономия' });

    expect(screen.getByRole('region', { name: 'Ближайшее действие' })).toBeInTheDocument();
    const who = screen.getByRole('region', { name: 'Кто ведёт' });
    expect(within(who).getByText('Мария Петровна')).toBeInTheDocument();

    const sources = screen.getByRole('region', { name: 'Источники' });
    expect(within(sources).getByText('в уроке · программа и учитель')).toBeInTheDocument();
    expect(
      within(sources).getByText('рекомендации по теме · не входит в урок'),
    ).toBeInTheDocument();
    expect(within(sources).getByText('NASA Live')).toBeInTheDocument();
  });

  it('teacher: same frame, group numbers instead of a personal grade', async () => {
    render([
      cabinetMock(
        cabinet({
          profileKind: 'TEACHER',
          studentCount: 24,
          progressPct: 71,
          sections: [
            {
              __typename: 'SubjectSection',
              id: 'sec2',
              title: 'Раздел 2 · Планетные системы',
              doneLessons: 6,
              totalLessons: 8,
              lessons: [{ ...DONE, grade: null, completedBy: 24, groupSize: 24 }],
            },
          ],
        }),
      ),
    ]);

    await screen.findByRole('heading', { name: 'Астрономия' });
    expect(screen.getByText(/Гимназия №1 · 24 ученика/)).toBeInTheDocument();
    expect(screen.getByText('программа группы')).toBeInTheDocument();
    expect(screen.getByText('24 из 24')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /На проверке/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Усвоение темы/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Открыть журнал' })).toBeInTheDocument();
  });

  it('cadet: own pace instead of a class, and «продолжить» on the current lesson', async () => {
    render([
      cabinetMock(
        cabinet({
          profileKind: 'CADET',
          title: 'English · A2',
          institutionName: null,
          groupName: null,
          teacherName: 'Ирина',
          nextLesson: { ...CURRENT, isLive: false, sessionAt: null, sessionId: null },
        }),
      ),
    ]);

    await screen.findByRole('heading', { name: 'English · A2' });
    expect(screen.getByText(/Свой темп · с тобой преподаватель Ирина/)).toBeInTheDocument();
    const rail = screen.getByRole('region', { name: 'Ближайшее действие' });
    expect(within(rail).getByRole('button', { name: 'Продолжить' })).toBeInTheDocument();
  });

  it('all four tabs of the sheet are live and switchable', async () => {
    render([
      cabinetMock(cabinet()),
      {
        request: { query: SubjectTasksDocument, variables: { courseId: COURSE } },
        result: { data: { subjectTasks: [] } },
      },
    ]);
    await screen.findByRole('heading', { name: 'Астрономия' });

    for (const name of [/Уроки/, /Материалы/, /Задания/, /Мой прогресс/]) {
      expect(screen.getByRole('tab', { name })).toBeEnabled();
    }
    await userEvent.click(screen.getByRole('tab', { name: /Задания/ }));
    expect(screen.getByRole('tab', { name: /Задания/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('empty programme says so instead of showing a blank page', async () => {
    render([cabinetMock(cabinet({ sections: [], nextLesson: null, progressPct: 0 }))]);
    await screen.findByRole('heading', { name: 'Астрономия' });

    expect(
      screen.getByText('Программа появится, когда преподаватель добавит уроки'),
    ).toBeInTheDocument();
    expect(screen.getByText('Ближайшего действия нет')).toBeInTheDocument();
  });

  it('empty saved block invites the quiet corner instead of looking broken', async () => {
    render([cabinetMock(cabinet({ savedMaterials: [] }))]);
    await screen.findByRole('heading', { name: 'Астрономия' });
    await userEvent.click(screen.getByRole('tab', { name: /Материалы/ }));

    expect(screen.getByText(/Здесь появится то, что вы сохраните/)).toBeInTheDocument();
  });

  it('shows a loading state before the cabinet arrives', () => {
    render([cabinetMock(cabinet())]);
    expect(screen.getByLabelText('Загрузка…')).toHaveAttribute('aria-busy', 'true');
  });

  it('a transport failure keeps its retry', async () => {
    render([
      {
        request: { query: SubjectCabinetDocument, variables: { courseId: COURSE } },
        error: new Error('network down'),
      },
    ]);

    expect(await screen.findByText(/Не получилось загрузить предмет/)).toBeInTheDocument();
  });

  it("someone else's course is not shown and not confirmed to exist", async () => {
    render([
      {
        request: { query: SubjectCabinetDocument, variables: { courseId: COURSE } },
        result: { errors: [new GraphQLError('Course not found')] },
      },
    ]);

    expect(await screen.findByText('Предмет недоступен')).toBeInTheDocument();
    // No subject data leaks through the refusal — not the title, not the teacher.
    expect(screen.queryByRole('heading', { name: 'Астрономия' })).not.toBeInTheDocument();
    expect(screen.queryByText('Мария Петровна')).not.toBeInTheDocument();
    // And it does not invite a retry — the server already answered.
    expect(screen.queryByRole('button', { name: /Повторить/ })).not.toBeInTheDocument();
  });
});
