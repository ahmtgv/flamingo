import type { UiRole } from './roles';

/** Student age band selected in the UI (drives which extra fields show). */
export type AgeBandUi = 'junior' | 'teen' | 'adult';

export interface RegisterFormValues {
  firstName: string;
  lastName: string;
  email: string;
  parentEmail: string;
  password: string;
  grade: string;
  birthDate: string;
  specialty: string;
  consent: boolean;
}

export const EMPTY_REGISTER: RegisterFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  parentEmail: '',
  password: '',
  grade: '',
  birthDate: '',
  specialty: '',
  consent: false,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmail(value: string): boolean {
  return EMAIL_RE.test(value);
}

/** field name -> i18n message key (translated at render time). */
export type Errors = Record<string, string>;

export function validateRegister(v: RegisterFormValues, role: UiRole, age: AgeBandUi): Errors {
  const e: Errors = {};
  if (!v.firstName.trim()) e.firstName = 'auth:validation.firstName';
  if (!v.lastName.trim()) e.lastName = 'auth:validation.lastName';
  if (!v.password) e.password = 'auth:validation.password';
  else if (v.password.length < 8) e.password = 'auth:validation.passwordShort';

  // A parent-managed junior logs in via the parent's email, so no own email.
  const juniorStudent = role === 'student' && age === 'junior';
  if (!juniorStudent) {
    if (!v.email.trim()) e.email = 'auth:validation.email';
    else if (!isEmail(v.email)) e.email = 'auth:validation.emailInvalid';
  }

  if (role === 'student') {
    if (!v.birthDate) e.birthDate = 'auth:validation.birthDate';
    if (age === 'junior' || age === 'teen') {
      if (!v.parentEmail.trim()) e.parentEmail = 'auth:validation.parentEmail';
      else if (!isEmail(v.parentEmail)) e.parentEmail = 'auth:validation.emailInvalid';
    }
    if (age === 'junior' && !v.consent) e.consent = 'auth:validation.consent';
  }

  if (role === 'teacher' && !v.specialty.trim()) e.specialty = 'auth:validation.specialty';
  return e;
}

export function validateLogin(email: string, password: string): Errors {
  const e: Errors = {};
  if (!email.trim()) e.email = 'auth:validation.email';
  else if (!isEmail(email)) e.email = 'auth:validation.emailInvalid';
  if (!password) e.password = 'auth:validation.password';
  return e;
}

export function validateEmail(email: string): Errors {
  const e: Errors = {};
  if (!email.trim()) e.email = 'auth:validation.email';
  else if (!isEmail(email)) e.email = 'auth:validation.emailInvalid';
  return e;
}

export function validateNewPassword(password: string): Errors {
  const e: Errors = {};
  if (!password) e.password = 'auth:validation.password';
  else if (password.length < 8) e.password = 'auth:validation.passwordShort';
  return e;
}
