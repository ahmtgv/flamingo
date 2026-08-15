import { type ReactNode, useEffect } from 'react';

import { DemoRoleSwitcher } from '@/shared/demo/DemoRoleSwitcher';
import { bootstrapSession } from '@/shared/lib/refresh';
import { ErrorBoundary } from '@/shared/ui';

import { Providers } from './providers';
import { AppRouter } from './router';

const IS_PREVIEW = import.meta.env.VITE_PREVIEW === '1';

/** Restores a session from the stored refresh token before routing decides. */
function Boot({ children }: { children: ReactNode }) {
  useEffect(() => {
    void bootstrapSession();
  }, []);
  return <>{children}</>;
}

export function App() {
  return (
    <Providers>
      <ErrorBoundary>
        <Boot>
          {/* Рама (лист D1) живёт ВНУТРИ роутера — см. AppRouter. Здесь она стояла снаружи, и
              первое же обращение к навигации из рамы валило приложение целиком. */}
          <AppRouter />
          {/* TEMPORARY: preview-only role switcher (remove with the demo layer). */}
          {IS_PREVIEW && <DemoRoleSwitcher />}
        </Boot>
      </ErrorBoundary>
    </Providers>
  );
}
