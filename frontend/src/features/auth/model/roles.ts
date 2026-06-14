import type { Role } from '@/entities/graphql/generated';

/** UI-facing role keys (lowercase) used in routes and form branching. */
export type UiRole = 'student' | 'parent' | 'teacher' | 'admin';

export const UI_ROLES: readonly UiRole[] = ['student', 'parent', 'teacher', 'admin'];

export function isUiRole(value: string): value is UiRole {
  return (UI_ROLES as readonly string[]).includes(value);
}

/** Map a UI role to the GraphQL enum value (STUDENT, PARENT, …). */
export function toGqlRole(role: UiRole): Role {
  return role.toUpperCase() as Role;
}
