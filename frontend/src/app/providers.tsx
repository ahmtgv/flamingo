import { ApolloProvider } from '@apollo/client';
import { type ReactNode, useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';

import i18n from '@/i18n';

import { apolloClient } from './apolloClient';
import { useAppSelector } from './hooks';
import { store } from './store';

/** Reflects UI state onto the document root so tokens.css can react. */
function ThemeSync(): null {
  const theme = useAppSelector((s) => s.ui.theme);
  const ageMode = useAppSelector((s) => s.ui.ageMode);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    if (ageMode === 'kids') {
      root.setAttribute('data-mode', 'kids');
    } else {
      root.removeAttribute('data-mode');
    }
  }, [theme, ageMode]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <ApolloProvider client={apolloClient}>
        <I18nextProvider i18n={i18n}>
          <ThemeSync />
          {children}
        </I18nextProvider>
      </ApolloProvider>
    </Provider>
  );
}
