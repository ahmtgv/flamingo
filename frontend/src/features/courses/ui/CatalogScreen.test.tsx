import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { CatalogDocument, type CatalogQuery } from '@/entities/graphql/generated';
import { renderWithProviders } from '@/test/renderWithProviders';

import { CatalogScreen } from './CatalogScreen';

const owner = (first: string, last: string) => ({
  __typename: 'TeacherProfile' as const,
  specialty: null,
  user: { __typename: 'User' as const, id: `u-${first}`, firstName: first, lastName: last, displayName: first, formalName: first, shortName: first, fullName: `${last} ${first}` },
});

const node = (over: Partial<CatalogQuery['catalog']['nodes'][number]>) => ({
  __typename: 'Course' as const,
  id: 'c-1',
  title: 'Алгебра: от уравнений к функциям',
  description: 'Системный курс на учебный год.',
  subject: 'Математика',
  level: 'GRADE_7' as const,
  format: 'PROGRAM' as const,
  status: 'PUBLISHED' as const,
  lessonCount: 36,
  // Ритм в заглушке пустой: курс без объявленного ритма законен, и витрина обязана
  // выглядеть правильно именно в этом, самом частом случае.
  lessonMinutes: null,
  lessonsPerWeek: null,
  lessonDays: [],
  enrollmentCount: 18,
  owner: owner('Мария', 'Петровна'),
  ...over,
});

const connection = (
  nodes: CatalogQuery['catalog']['nodes'],
  totalCount: number,
  subjectCount: number,
): CatalogQuery => ({
  __typename: 'Query',
  catalog: {
    __typename: 'CourseConnection',
    totalCount,
    subjectCount,
    pageInfo: { __typename: 'PageInfo', hasNextPage: false, endCursor: null },
    nodes,
  },
});

const catalogMock = (
  filter: Record<string, unknown> | null,
  data: CatalogQuery,
) => ({
  request: { query: CatalogDocument, variables: { first: 50, filter } },
  result: { data },
});

describe('CatalogScreen — atlas 04', () => {
  it('шапка считает найденное, карточка называет курс, преподавателя и состояние', async () => {
    const data = connection(
      [
        node({ id: 'c-alg' }),
        node({ id: 'c-phys', title: 'Физика: вторая часть', subject: 'Физика', level: 'GRADE_9', enrollmentCount: 0, owner: owner('Дмитрий', 'А.') }),
      ],
      142,
      12,
    );
    renderWithProviders(<CatalogScreen />, { mocks: [catalogMock(null, data)], route: '/courses' });

    expect(await screen.findByText('Курсы')).toBeInTheDocument();
    // Лист считает не «курсы и предметы», а «найдено · показано»: человеку важно, сколько
    // из найденного он сейчас видит, а не сколько предметов есть в природе.
    expect(screen.getByText(/найдено 142 · показано/)).toBeInTheDocument();
    expect(screen.getByText('Алгебра: от уравнений к функциям')).toBeInTheDocument();
    // 🔴 Размер группы — сколько записано СЕЙЧАС, а не «до восьми»: вместимости в модели
    // нет, и обещать её нельзя (решение владельца §47). Ноль называется «пока никого», а не
    // «новый»: «новый» — про курс, а колонка про людей.
    expect(screen.getByText('пока никого')).toBeInTheDocument();
    expect(screen.getByText('в группе: 18')).toBeInTheDocument();
    // Курс без занятий говорит об этом словами, а не молчит и не выдумывает дату.
    expect(screen.getAllByText('занятий пока нет').length).toBeGreaterThan(0);
    // search + chips are present in the populated catalog
    expect(screen.getByRole('searchbox', { name: 'Поиск по каталогу' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'математика' })).toBeInTheDocument();
  });

  it('пустой каталог объясняет словами; отбор при этом остаётся на месте', async () => {
    renderWithProviders(<CatalogScreen />, {
      mocks: [catalogMock(null, connection([], 0, 0))],
      route: '/courses',
    });
    expect(await screen.findByText('Каталог наполняется')).toBeInTheDocument();
    // ⚠️ Прежде поиск и признаки ПРЯТАЛИСЬ на пустом каталоге. На листе рельс отбора стоит
    // слева всегда: исчезающая половина экрана читается как поломка, а не как «пока пусто».
    // Макет не прыгает между состояниями (ПРАВИЛА 6.6).
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Отбор курсов' })).toBeInTheDocument();
  });

  it('never asserts "0 курсов" while the query is still in flight', async () => {
    const data = connection([node({ id: 'c-alg' })], 142, 12);
    renderWithProviders(<CatalogScreen />, {
      mocks: [{ ...catalogMock(null, data), delay: 30 }],
      route: '/courses',
    });
    // Счётчик молчит, пока ответа нет: «найдено 0» во время запроса — это неправда, а не
    // «пока неизвестно». Появляется он только вместе с числом.
    expect(screen.queryByText(/найдено 0/)).not.toBeInTheDocument();
    expect(await screen.findByText(/найдено 142/)).toBeInTheDocument();
  });

  it('typing a search releases a chip whose own filter it would override (ОГЭ)', async () => {
    const user = userEvent.setup();
    const data = connection([node({ id: 'c-alg' })], 142, 12);
    renderWithProviders(<CatalogScreen />, {
      mocks: [
        catalogMock(null, data),
        catalogMock({ search: 'ОГЭ' }, data),
        catalogMock({ search: 'а' }, data),
      ],
      route: '/courses',
    });
    await screen.findByText('Алгебра: от уравнений к функциям');

    // Признак снимается повторным нажатием, поэтому «все» отдельной кнопкой больше нет:
    // рельс листа состоит из признаков, а не из признаков плюс «сбросить всё».
    await user.click(screen.getByRole('button', { name: 'ОГЭ' }));
    expect(screen.getByRole('button', { name: 'ОГЭ' })).toHaveAttribute('aria-pressed', 'true');

    await user.type(screen.getByRole('searchbox', { name: 'Поиск по каталогу' }), 'а');
    // the chip no longer claims to be filtering — its search term was overridden
    expect(screen.getByRole('button', { name: 'ОГЭ' })).toHaveAttribute('aria-pressed', 'false');
    // Ни один признак не нажат — отбор идёт по строке поиска, и рельс это показывает.
    for (const name of ['математика', 'языки', 'физика', '7 класс', 'ОГЭ']) {
      expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'false');
    }
  });

  it('no-results under a chip filter: shows "Ничего не нашлось" + reset', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CatalogScreen />, {
      mocks: [
        catalogMock(null, connection([node({ id: 'c-alg' })], 142, 12)),
        catalogMock({ subject: 'физика' }, connection([], 0, 0)),
      ],
      route: '/courses',
    });
    await screen.findByText('Алгебра: от уравнений к функциям');
    await user.click(screen.getByRole('button', { name: 'физика' }));

    expect(await screen.findByText('Ничего не нашлось')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Сбросить фильтры' })).toBeInTheDocument();
  });
});
