import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import { CLASS_LAYOUTS, type Participant } from '../classLayout';

import { ClassWindow } from './ClassWindow';

const teacher: Participant = { id: 't', name: 'Люция Валерьевна', initials: 'ЛВ' };
const pupils: Participant[] = [
  { id: 'p1', name: 'Аня', initials: 'АК', handRaised: true },
  { id: 'p2', name: 'Петя', initials: 'ПК' },
  { id: 'p3', name: 'Лена', initials: 'ЛМ' },
  { id: 'p4', name: 'Дима', initials: 'ДС' },
  { id: 'p5', name: 'Ира', initials: 'ИВ' },
];

describe('окно «Класс» (лист D1)', () => {
  it('🔴 преподаватель на экране в любой раскладке', () => {
    for (const layout of CLASS_LAYOUTS) {
      const { unmount } = renderWithProviders(
        <ClassWindow teacher={teacher} pupils={pupils} layout={layout} pinnedId="p2" />,
      );
      expect(screen.getByText('Люция Валерьевна')).toBeInTheDocument();
      expect(screen.getByText('преподаватель')).toBeInTheDocument();
      unmount();
    }
  });

  it('преподавателя нельзя вывести «на большой экран» — он и так там', () => {
    renderWithProviders(
      <ClassWindow teacher={teacher} pupils={pupils} layout="group" onPin={vi.fn()} />,
    );
    // One button per pupil and not one more: the teacher's tile has no way to be displaced.
    const pins = screen.getAllByRole('button', { name: 'На большой экран' });
    expect(pins).toHaveLength(pupils.length);
  });

  it('любого ученика можно вывести рядом с собой', async () => {
    const onPin = vi.fn();
    renderWithProviders(
      <ClassWindow teacher={teacher} pupils={pupils} layout="group" onPin={onPin} />,
    );
    await userEvent.click(screen.getAllByRole('button', { name: 'На большой экран' })[2]);
    expect(onPin).toHaveBeenCalledWith('p3');
  });

  it('поднятая рука видна на плитке', () => {
    renderWithProviders(<ClassWindow teacher={teacher} pupils={pupils} layout="group" />);
    expect(screen.getByText('рука ↑')).toBeInTheDocument();
  });

  it('где качество снижено — видно (Р5.1)', () => {
    const degraded = pupils.map((p, i) => (i > 2 ? { ...p, degraded: true } : p));
    renderWithProviders(<ClassWindow teacher={teacher} pupils={degraded} layout="group" />);
    expect(screen.getAllByText('качество снижено')).toHaveLength(2);
  });

  it('своя плитка подписана «вы», а не именем', () => {
    const withSelf = [{ ...pupils[0], isSelf: true }, ...pupils.slice(1)];
    renderWithProviders(<ClassWindow teacher={teacher} pupils={withSelf} layout="group" />);
    expect(screen.getByText('вы')).toBeInTheDocument();
    expect(screen.queryByText('Аня')).not.toBeInTheDocument();
  });

  it('окно выдерживает урок, на который ещё никто не дошёл', () => {
    renderWithProviders(<ClassWindow teacher={teacher} pupils={[]} layout="group" />);
    expect(screen.getByText('Люция Валерьевна')).toBeInTheDocument();
  });
});
