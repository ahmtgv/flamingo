import { describe, expect, it } from 'vitest';

import { EMPTY_REGISTER, validateLogin, validateRegister } from './validation';

describe('validateRegister', () => {
  it('requires 152-FZ consent and a parent email for a junior pupil (no own email)', () => {
    const e = validateRegister(
      { ...EMPTY_REGISTER, firstName: 'Соня', lastName: 'А', birthDate: '2018-01-01', password: 'longenough1' },
      'student',
      'junior',
    );
    expect(e.parentEmail).toBeTruthy();
    expect(e.consent).toBe('auth:validation.consent');
    expect(e.email).toBeUndefined();
  });

  it('requires an own email for an adult pupil and no consent/parent email', () => {
    const e = validateRegister(
      { ...EMPTY_REGISTER, firstName: 'A', lastName: 'B', birthDate: '2000-01-01', password: 'longenough1' },
      'student',
      'adult',
    );
    expect(e.email).toBeTruthy();
    // 🔴 Б3: согласие 152-ФЗ нужно КАЖДОЙ роли, а не только младшему ученику.
    expect(e.consent).toBe('auth:validation.consent');
    expect(e.parentEmail).toBeUndefined();
  });

  it('requires a specialty for a teacher', () => {
    const e = validateRegister(
      { ...EMPTY_REGISTER, firstName: 'A', lastName: 'B', email: 'a@b.co', password: 'longenough1' },
      'teacher',
      'adult',
    );
    expect(e.specialty).toBe('auth:validation.specialty');
  });

  it('flags a short password', () => {
    const e = validateRegister(
      { ...EMPTY_REGISTER, firstName: 'A', lastName: 'B', email: 'a@b.co', password: 'short' },
      'parent',
      'adult',
    );
    expect(e.password).toBe('auth:validation.passwordShort');
  });
});

describe('validateLogin', () => {
  it('passes for valid credentials', () => {
    expect(Object.keys(validateLogin('a@b.co', 'password1'))).toHaveLength(0);
  });

  it('rejects a malformed email', () => {
    expect(validateLogin('bad', 'password1').email).toBe('auth:validation.emailInvalid');
  });
});
