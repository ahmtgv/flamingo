import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { CatalogDocument, type CatalogQuery } from '@/entities/graphql/generated';
import { renderWithProviders } from '@/test/renderWithProviders';

import { CatalogScreen } from './CatalogScreen';

const owner = (first: string, last: string) => ({
  __typename: 'TeacherProfile' as const,
  specialty: null,
  user: { __typename: 'User' as const, id: `u-${first}`, firstName: first, lastName: last },
});

const node = (over: Partial<CatalogQuery['catalog']['nodes'][number]>) => ({
  __typename: 'Course' as const,
  id: 'c-1',
  title: 'Алгебра: от уравнений к функциям',
  description: 'Системный курс на учебный год.',
  subject: 'Математика',
  level: 'GRADE_7' as const,
  status: 'PUBLISHED' as const,
  lessonCount: 36,
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
  it('full: renders headrow meta, cards, and a "новый" course badge', async () => {
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
    expect(screen.getByText(/142 курса · 12 предметов/)).toBeInTheDocument();
    expect(screen.getByText('Алгебра: от уравнений к функциям')).toBeInTheDocument();
    // enrollmentCount 0 → "новый"; >0 → "N учеников"
    expect(screen.getByText('новый')).toBeInTheDocument();
    expect(screen.getByText('18 учеников')).toBeInTheDocument();
    // search + chips are present in the populated catalog
    expect(screen.getByRole('searchbox', { name: 'Поиск по каталогу' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'математика' })).toBeInTheDocument();
  });

  it('platform-zero: shows "Каталог наполняется" and hides search + chips', async () => {
    renderWithProviders(<CatalogScreen />, {
      mocks: [catalogMock(null, connection([], 0, 0))],
      route: '/courses',
    });
    expect(await screen.findByText('Каталог наполняется')).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'все' })).not.toBeInTheDocument();
  });

  it('never asserts "0 курсов" while the query is still in flight', async () => {
    const data = connection([node({ id: 'c-alg' })], 142, 12);
    renderWithProviders(<CatalogScreen />, {
      mocks: [{ ...catalogMock(null, data), delay: 30 }],
      route: '/courses',
    });
    // headrow stays silent rather than claiming an empty catalog while loading
    expect(screen.queryByText(/0 курсов/)).not.toBeInTheDocument();
    expect(await screen.findByText(/142 курса · 12 предметов/)).toBeInTheDocument();
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

    await user.click(screen.getByRole('button', { name: 'ОГЭ' }));
    expect(screen.getByRole('button', { name: 'ОГЭ' })).toHaveAttribute('aria-pressed', 'true');

    await user.type(screen.getByRole('searchbox', { name: 'Поиск по каталогу' }), 'а');
    // the chip no longer claims to be filtering — its search term was overridden
    expect(screen.getByRole('button', { name: 'ОГЭ' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'все' })).toHaveAttribute('aria-pressed', 'true');
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
