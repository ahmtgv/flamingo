/** Swap the item at `index` with its neighbour in `dir` (-1 up / +1 down).
 * Returns the array unchanged at a boundary. Used to compute the `orderedIds`
 * payload for reorderSections / reorderLessons. */
export function move(ids: string[], index: number, dir: -1 | 1): string[] {
  const target = index + dir;
  if (target < 0 || target >= ids.length) return ids;
  const next = [...ids];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
