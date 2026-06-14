import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import {
  LoginScreen,
  RegisterScreen,
  ResetConfirmScreen,
  ResetRequestScreen,
  RoleSelectScreen,
} from '@/features/auth';
import { HomeScreen } from '@/features/home';
import { useSession } from '@/shared/hooks/useSession';

import styles from './app.module.css';

function FullScreenLoader() {
  const { t } = useTranslation('common');
  return <div className={styles.loader}>{t('actions.loading')}</div>;
}

/** Gate authenticated areas; redirect anonymous users to login. */
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useSession();
  if (status === 'unknown') return <FullScreenLoader />;
  if (status !== 'authenticated') return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Keep authenticated users out of the auth screens. */
function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { status } = useSession();
  if (status === 'authenticated') return <Navigate to="/app" replace />;
  return <>{children}</>;
}

function RootRedirect() {
  const { status } = useSession();
  if (status === 'unknown') return <FullScreenLoader />;
  return <Navigate to={status === 'authenticated' ? '/app' : '/login'} replace />;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginScreen />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <RoleSelectScreen />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register/:role"
          element={
            <PublicOnlyRoute>
              <RegisterScreen />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/reset"
          element={
            <PublicOnlyRoute>
              <ResetRequestScreen />
            </PublicOnlyRoute>
          }
        />
        {/* Token-based; reachable whether or not signed in (from an email link). */}
        <Route path="/reset-password" element={<ResetConfirmScreen />} />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <HomeScreen />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
