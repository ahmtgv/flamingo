import { describe, expect, it } from 'vitest';

import { move } from './reorder';

describe('move', () => {
  it('swaps an item up', () => {
    expect(move(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c']);
  });

  it('swaps an item down', () => {
    expect(move(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'c', 'b']);
  });

  it('is a no-op past the top boundary', () => {
    expect(move(['a', 'b', 'c'], 0, -1)).toEqual(['a', 'b', 'c']);
  });

  it('is a no-op past the bottom boundary', () => {
    expect(move(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'b', 'c']);
  });

  it('does not mutate the input', () => {
    const ids = ['a', 'b', 'c'];
    move(ids, 1, 1);
    expect(ids).toEqual(['a', 'b', 'c']);
  });
});
