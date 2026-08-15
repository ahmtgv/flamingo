import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { type MeQuery, UploadPolicyDocument } from '@/entities/graphql/generated';
import { renderWithProviders } from '@/test/renderWithProviders';

import { VerificationBanner } from './VerificationBanner';

/**
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
  renderWithProviders(<VerificationBanner profile={p} />, { mocks: [policyMock], route: '/app' });

describe('баннер верификации', () => {
  it('🔴 ничего не загружено — говорит, что нужно сделать, а не «проверяем»', async () => {
    render(profile());

    expect(await screen.findByText(/загрузите документ об образовании/i)).toBeInTheDocument();
    expect(screen.queryByText(/Документы на проверке/)).not.toBeInTheDocument();
    // И даёт кнопку прямо здесь: искать, где загрузить, человеку негде.
    expect(screen.getByText('Загрузить документ')).toBeInTheDocument();
  });

  it('документ загружен — вот теперь «на проверке», и видно какой', async () => {
    render(profile({ verificationDocuments: [doc()] } as Partial<TeacherProfile>));

    expect(await screen.findByText(/Документы на проверке/)).toBeInTheDocument();
    expect(screen.getByText(/Диплом\.pdf/)).toBeInTheDocument();
    // Ждущему решения загружать нечего — кнопки нет.
    expect(screen.queryByText('Загрузить документ')).not.toBeInTheDocument();
  });

  it('отказ печатает причину — молчащий отказ и был жалобой', async () => {
    render(
      profile({
        verificationStatus: 'REJECTED',
        verificationDocuments: [doc({ status: 'REJECTED', reason: 'Скан нечитаем' })],
      } as Partial<TeacherProfile>),
    );

    expect(await screen.findByText(/Проверка не пройдена/)).toBeInTheDocument();
    expect(screen.getByText(/Скан нечитаем/)).toBeInTheDocument();
    // И даёт загрузить другой: отказ без выхода — тупик.
    expect(screen.getByText('Загрузить другой документ')).toBeInTheDocument();
  });

  it('подтверждён — молчит: счастливый путь листа 03 чист', () => {
    const { container } = render(profile({ verificationStatus: 'APPROVED' }));
    expect(container).toBeEmptyDOMElement();
  });

  it('правила загрузки названы до выбора файла', async () => {
    render(profile());
    expect(await screen.findByText(/До 25 МБ/)).toBeInTheDocument();
  });
});
