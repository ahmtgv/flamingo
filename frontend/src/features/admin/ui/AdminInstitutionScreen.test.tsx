import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import {
  AdminInstitutionDocument,
  InstitutionGroupsDocument,
  InstitutionMembersDocument,
} from '@/entities/graphql/generated';
import { renderWithProviders } from '@/test/renderWithProviders';

import { AdminInstitutionScreen } from './AdminInstitutionScreen';

function adminInstitutionMock(institution: unknown) {
  return {
    request: { query: AdminInstitutionDocument },
    result: { data: { me: { __typename: 'User', adminProfile: { __typename: 'AdminProfile', institution } } } },
  };
}

const institution = {
  __typename: 'Institution',
  id: 'inst1',
  name: 'Школа №1',
  address: '',
  website: '',
  subdomain: null,
  status: 'ACTIVE',
  defaultLocale: 'ru',
  branding: {},
  logoUrl: null,
};

const membersMock = () => ({
  request: { query: InstitutionMembersDocument, variables: { institutionId: 'inst1' } },
  result: { data: { institutionMembers: [] } },
});

const groupsMock = {
  request: { query: InstitutionGroupsDocument, variables: { institutionId: 'inst1' } },
  result: { data: { groups: [] } },
};

function renderAdmin(mocks: unknown[]) {
  renderWithProviders(
    <Routes>
      <Route path="/admin" element={<AdminInstitutionScreen />} />
    </Routes>,
    { mocks: mocks as never, route: '/admin' },
  );
}

describe('AdminInstitutionScreen', () => {
  it('shows the empty state when the admin has no institution', async () => {
    renderAdmin([adminInstitutionMock(null)]);
    expect(await screen.findByText(/Вы пока не привязаны к учреждению/)).toBeInTheDocument();
  });

  it('renders the institution with management sections', async () => {
    // MembersSection and GroupsSection each query InstitutionMembers -> two mocks.
    renderAdmin([adminInstitutionMock(institution), membersMock(), membersMock(), groupsMock]);

    expect(await screen.findByText('Школа №1')).toBeInTheDocument();
    expect(screen.getByText('Настройки учреждения')).toBeInTheDocument();
    expect(screen.getByText('Участники')).toBeInTheDocument();
    expect(screen.getByText('Группы')).toBeInTheDocument();
  });
});
