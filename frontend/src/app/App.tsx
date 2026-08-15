import { type ReactNode, useEffect } from 'react';

import { DemoRoleSwitcher } from '@/shared/demo/DemoRoleSwitcher';
import { primeMachineKey } from '@/features/desktop/machineKey';
import { bootstrapSession } from '@/shared/lib/refresh';
import { ErrorBoundary } from '@/shared/ui';

import { Providers } from './providers';
import { AppRouter } from './router';

const IS_PREVIEW = import.meta.env.VITE_PREVIEW === '1';

/**
 * Восстанавливает сессию из сохранённого refresh-токена до того, как роутер примет решение,
 * и — в приложении — поднимает ключ машины из связки в память.
 *
 * Ключ нужен раньше, чем мастер дойдёт до шага 2: там начинаются мутации, требующие
 * `Authorization: Device`. Читается один раз; в браузере это no-op.
 */
function Boot({ children }: { children: ReactNode }) {
  useEffect(() => {
    void bootstrapSession();
    void primeMachineKey();
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
