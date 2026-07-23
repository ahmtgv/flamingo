import { type ReactNode, useEffect } from 'react';

import { DemoRoleSwitcher } from '@/shared/demo/DemoRoleSwitcher';
import { bootstrapSession } from '@/shared/lib/refresh';

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
      <Boot>
        <AppRouter />
        {/* TEMPORARY: preview-only role switcher (remove with the demo layer). */}
        {IS_PREVIEW && <DemoRoleSwitcher />}
      </Boot>
    </Providers>
  );
}
