/**
 * TEMPORARY floating role switcher, visible ONLY in preview builds (VITE_PREVIEW=1).
 *
 * Lets a reviewer browse each role's cabinet by flipping `?role=` (student | teacher | parent
 * | admin). Changing the role reloads with a fresh Apollo cache so `Me` re-resolves cleanly.
 * Remove with the demo layer before real launch.
 */
import { Button } from '@/shared/ui';

import { type DemoRole, demoRole } from './demoRole';

const OPTIONS: { role: DemoRole; label: string }[] = [
  { role: 'student', label: 'Ученик' },
  { role: 'teacher', label: 'Преподаватель' },
  { role: 'parent', label: 'Родитель' },
  { role: 'admin', label: 'Админ' },
];

function switchRole(role: DemoRole): void {
  const url = new URL(window.location.href);
  url.searchParams.set('role', role);
  // Full reload → fresh Apollo cache so the new persona's Me/queries re-resolve.
  window.location.href = url.toString();
}

export function DemoRoleSwitcher() {
  const active = demoRole();
  return (
    <div
      role="group"
      aria-label="Демо-режим: выбор роли"
      style={{
        position: 'fixed',
        left: 'var(--space-4)',
        bottom: 'var(--space-4)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        padding: 'var(--space-2)',
        borderRadius: 'var(--radius-pill)',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-overline)',
          color: 'var(--color-text-tertiary)',
          paddingInlineStart: 'var(--space-1)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        демо
      </span>
      {OPTIONS.map((o) => (
        <Button
          key={o.role}
          size="sm"
          variant={o.role === active ? 'primary' : 'secondary'}
          aria-pressed={o.role === active}
          onClick={() => switchRole(o.role)}
        >
          {o.label}
        </Button>
      ))}
    </div>
  );
}
