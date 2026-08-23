import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { type MeQuery, UploadPolicyDocument } from '@/entities/graphql/generated';
import { renderWithProviders } from '@/test/renderWithProviders';

import { VerificationLine } from './VerificationLine';

/**
 * 🔴 ПЕРЕЕХАЛО В УЧЁТНУЮ ЗАПИСЬ (наряд 50 §1). Раньше это была жёлтая плашка во всю ширину
 * кабинета и стартовой — и читалась как условие работы. Владелец решал дважды: проверка
 * диплома НИЧЕГО НЕ ЗАПРЕЩАЕТ. Проверки сохранены, место и вид — новые.
 *
 * Верификация — сторона преподавателя (находка владельца 15.08, п.4).
 *
 * 🔴 Главное, что здесь пришпилено: «не загружал» и «жду решения» — РАЗНЫЕ состояния.
 * `verificationStatus` рождается со значением PENDING, поэтому баннер «Документы на проверке»
 * висел у каждого преподавателя, включая тех, кто ничего не отправлял. Человек ждал решения,
 * которого никто не принимал, потому что решать было нечего.
 */

type TeacherProfile = NonNullable<NonNullable<MeQuery['me']>['teacherProfile']>;

const policyMock = {
  request: { query: UploadPolicyDocument, variables: { purpose: 'VERIFICATION' } },
  result: {
    data: {
      uploadPolicy: {
        __typename: 'UploadPolicy',
        purpose: 'VERIFICATION',
        maxBytes: 25 * 1024 * 1024,
        contentTypes: ['application/pdf', 'image/jpeg'],
      },
    },
  },
};

const doc = (over: Record<string, unknown> = {}) => ({
  __typename: 'VerificationDocument',
  id: 'd1',
  filename: 'Диплом.pdf',
  sizeBytes: 2_100_000,
  status: 'PENDING',
  reason: '',
  createdAt: '2026-08-14T10:00:00Z',
  ...over,
});

const profile = (over: Partial<TeacherProfile> = {}) =>
  ({
    __typename: 'TeacherProfile',
    verificationStatus: 'PENDING',
    specialty: 'Физика',
    verificationDocuments: [],
    ...over,
  }) as unknown as TeacherProfile;

const render = (p: TeacherProfile) =>
  renderWithProviders(<VerificationLine profile={p} />, { mocks: [policyMock], route: '/account' });

describe('проверка диплома в учётной записи', () => {
  it('🔴 ничего не загружено — так и сказано, и это не «проверяем»', async () => {
    render(profile());

    expect(await screen.findByText(/Документ не отправлен/)).toBeInTheDocument();
    expect(screen.queryByText(/Документ на проверке/)).not.toBeInTheDocument();
    // И даёт кнопку прямо здесь: искать, где загрузить, человеку негде.
    expect(screen.getByText('Приложить документ')).toBeInTheDocument();
  });

  it('документ загружен — вот теперь «на проверке», и видно какой', async () => {
    render(profile({ verificationDocuments: [doc()] } as Partial<TeacherProfile>));

    expect(await screen.findByText(/Документ на проверке/)).toBeInTheDocument();
    expect(screen.getByText(/Диплом\.pdf/)).toBeInTheDocument();
    /*
     * ⚠️ Кнопка ОСТАЁТСЯ, и это изменение смысла (§50.1). В плашке её прятали, потому что
     * плашка читалась как «мы решаем — не мешайте». Проверка ничего не запрещает, и прислать
     * другой документ, пока идёт первый, человек вправе.
     */
    expect(screen.getByText('Приложить документ')).toBeInTheDocument();
  });

  it('отказ печатает причину — молчащий отказ и был жалобой', async () => {
    render(
      profile({
        verificationStatus: 'REJECTED',
        verificationDocuments: [doc({ status: 'REJECTED', reason: 'Скан нечитаем' })],
      } as Partial<TeacherProfile>),
    );

    expect(await screen.findByText(/Документ не приняли/)).toBeInTheDocument();
    expect(screen.getByText(/Скан нечитаем/)).toBeInTheDocument();
    // И даёт загрузить другой: отказ без выхода — тупик.
    expect(screen.getByText('Приложить документ')).toBeInTheDocument();
  });

  it('подтверждён — сказано, что отметка стоит, и приложить больше нечего', () => {
    renderWithProviders(
      <VerificationLine profile={profile({ verificationStatus: 'APPROVED' } as Partial<TeacherProfile>)} />,
      { mocks: [policyMock], route: '/account' },
    );

    expect(screen.getByText(/Диплом подтверждён/)).toBeInTheDocument();
    // Кнопки приложить документ у подтверждённого нет: прикладывать больше нечего.
    expect(screen.queryByText('Приложить документ')).not.toBeInTheDocument();
  });

  it('🔴 сказано, что проверка ничего не ограничивает', () => {
    // Ровно то, ради чего плашка и убрана: она читалась как условие работы.
    renderWithProviders(<VerificationLine profile={profile()} />, {
      mocks: [policyMock],
      route: '/account',
    });

    expect(screen.getByText(/ничего не ограничивает/)).toBeInTheDocument();
  });

  it('правила загрузки названы до выбора файла', async () => {
    render(profile());
    expect(await screen.findByText(/Приложить документ/)).toBeInTheDocument();
  });
});
