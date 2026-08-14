import { describe, expect, it } from 'vitest';

import {
  CLASS_LAYOUTS,
  type Participant,
  seats,
  suggestedLayout,
} from './classLayout';

const teacher: Participant = { id: 't', name: 'Люция Валерьевна', initials: 'ЛВ' };
const pupil = (n: number): Participant => ({ id: `p${n}`, name: `Ученик ${n}`, initials: `У${n}` });
const pupils = (n: number) => Array.from({ length: n }, (_, i) => pupil(i + 1));

describe('окно «Класс» — раскладки (лист D1, решения владельца 14.08)', () => {
  it('🔴 преподаватель виден всегда — в любой раскладке и при любом составе', () => {
    // The rule the whole window exists to keep. Not «active speaker» jumping around the frame,
    // but a constant anchor — so there must be no combination that loses them.
    for (const layout of CLASS_LAYOUTS) {
      for (let n = 0; n <= 12; n += 1) {
        const seating = seats(teacher, pupils(n), layout);
        expect(seating.teacher).toEqual(teacher);
        // And never in a seat that can be displaced by a pupil.
        expect(seating.main?.id).not.toBe(teacher.id);
        expect(seating.side.map((p) => p.id)).not.toContain(teacher.id);
        expect(seating.row.map((p) => p.id)).not.toContain(teacher.id);
      }
    }
  });

  it('никого не теряет и никого не показывает дважды', () => {
    for (const layout of CLASS_LAYOUTS) {
      const all = pupils(9);
      const seating = seats(teacher, all, layout);
      const shown = [seating.main, ...seating.side, ...seating.row]
        .filter((p): p is Participant => p !== null)
        .map((p) => p.id);
      expect(new Set(shown).size).toBe(shown.length);
      expect(shown.sort()).toEqual(all.map((p) => p.id).sort());
    }
  });

  it('вдвоём — преподаватель и ученик поровну', () => {
    const seating = seats(teacher, pupils(1), 'pair');
    expect(seating.main?.id).toBe('p1');
    expect(seating.side).toHaveLength(0);
    expect(seating.row).toHaveLength(0);
  });

  it('группа — четверо делят вторую половину, остальные уходят в ленту', () => {
    const seating = seats(teacher, pupils(7), 'group');
    expect(seating.main).toBeNull();
    expect(seating.side.map((p) => p.id)).toEqual(['p1', 'p2', 'p3', 'p4']);
    expect(seating.row.map((p) => p.id)).toEqual(['p5', 'p6', 'p7']);
  });

  it('ученик рядом — выбранный на большом экране, остальные в ленте', () => {
    const seating = seats(teacher, pupils(5), 'pinned', 'p3');
    expect(seating.main?.id).toBe('p3');
    expect(seating.side).toHaveLength(0);
    expect(seating.row.map((p) => p.id)).toEqual(['p1', 'p2', 'p4', 'p5']);
  });

  it('раскладка выдерживает пустой класс — урок начинается до того, как кто-то дошёл', () => {
    for (const layout of CLASS_LAYOUTS) {
      const seating = seats(teacher, [], layout);
      expect(seating.teacher).toEqual(teacher);
      expect(seating.main).toBeNull();
    }
  });

  it('подсказка раскладки — предложение, а не запрет', () => {
    // §2.2-бис «не изобретать ограничений»: the frame may open on a sensible default; every
    // other layout stays reachable, and nothing here can refuse one.
    expect(suggestedLayout(1)).toBe('pair');
    expect(suggestedLayout(5)).toBe('group');
    expect(CLASS_LAYOUTS).toHaveLength(3);
  });
});
