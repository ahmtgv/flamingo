import { describe, expect, it } from 'vitest';

import { classifyMediaError } from './mediaError';

describe('classifyMediaError', () => {
  it('maps each getUserMedia DOMException name to its bucket', () => {
    expect(classifyMediaError({ name: 'NotAllowedError' })).toBe('denied');
    expect(classifyMediaError({ name: 'SecurityError' })).toBe('denied');
    expect(classifyMediaError({ name: 'NotFoundError' })).toBe('notFound');
    expect(classifyMediaError({ name: 'OverconstrainedError' })).toBe('notFound');
    expect(classifyMediaError({ name: 'NotReadableError' })).toBe('inUse');
    expect(classifyMediaError({ name: 'AbortError' })).toBe('inUse');
  });

  it('works with a real DOMException', () => {
    expect(classifyMediaError(new DOMException('blocked', 'NotAllowedError'))).toBe('denied');
  });

  it('falls back to generic for unknown / malformed errors', () => {
    expect(classifyMediaError({ name: 'WeirdError' })).toBe('generic');
    expect(classifyMediaError(new Error('boom'))).toBe('generic'); // Error.name === 'Error'
    expect(classifyMediaError(undefined)).toBe('generic');
    expect(classifyMediaError(null)).toBe('generic');
    expect(classifyMediaError('nope')).toBe('generic');
  });
});
