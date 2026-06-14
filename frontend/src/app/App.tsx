import { type ReactNode, useEffect } from 'react';

import { bootstrapSession } from '@/shared/lib/refresh';

import { Providers } from './providers';
import { AppRouter } from './router';

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
      </Boot>
    </Providers>
  );
}
