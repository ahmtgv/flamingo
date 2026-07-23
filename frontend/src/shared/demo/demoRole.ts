/**
 * TEMPORARY preview-only role selection (VITE_PREVIEW=1).
 *
 * The browser demo layer has no backend, so the "logged-in" role is chosen from the
 * `?role=` query parameter (student | teacher | parent | admin), defaulting to `teacher`.
 * Changing `?role=` re-renders the app as that persona (see the Me resolver + DemoRoleSwitcher).
 *
 * Remove this together with the demo layer and the VITE_PREVIEW short-circuit before real launch.
 */
import type { Role } from '@/entities/graphql/generated';

export type DemoRole = 'student' | 'teacher' | 'parent' | 'admin';

const ROLES: readonly DemoRole[] = ['student', 'teacher', 'parent', 'admin'];

/** The active demo role from `?role=`; defaults to `teacher` when absent/invalid. */
export function demoRole(): DemoRole {
  try {
    const r = new URLSearchParams(window.location.search).get('role');
    return ROLES.includes(r as DemoRole) ? (r as DemoRole) : 'teacher';
  } catch {
    return 'teacher';
  }
}

const GRAPHQL_ROLE: Record<DemoRole, Role> = {
  student: 'STUDENT',
  teacher: 'TEACHER',
  parent: 'PARENT',
  admin: 'ADMIN',
};

/** The active demo role as the GraphQL `Role` enum value (drives which cabinet renders). */
export function demoGraphQLRole(): Role {
  return GRAPHQL_ROLE[demoRole()];
}
