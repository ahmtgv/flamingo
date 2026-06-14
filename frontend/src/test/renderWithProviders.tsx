import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { render } from '@testing-library/react';
import { type ReactElement, type ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';

import { store } from '@/app/store';
import i18n from '@/i18n';

interface Options {
  mocks?: MockedResponse[];
  route?: string;
}

/** Render a component inside the full app context (Apollo mock, Redux, i18n, router). */
export function renderWithProviders(ui: ReactElement, { mocks = [], route = '/' }: Options = {}) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MockedProvider mocks={mocks}>
        <Provider store={store}>
          <I18nextProvider i18n={i18n}>
            <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
          </I18nextProvider>
        </Provider>
      </MockedProvider>
    );
  }
  return render(ui, { wrapper: Wrapper });
}
