import { fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it } from 'vitest';

import i18n from '@/i18n';
import { CMF } from '@/seedum/cmfConfig';

import { ClassField, type FieldStudent } from './ClassField';

const NAMES: Record<string, string> = { a: 'Аня', b: 'Боря' };
const nameFor = (id: string) => NAMES[id] ?? id;

const mk = (id: string, value: number, over: Partial<FieldStudent> = {}): FieldStudent => ({
  id,
  value,
  gaze: 84,
  eyes: 91,
  headYaw: 6,
  headPitch: -3,
  alert: 77,
  ...over,
});

function renderField(students: FieldStudent[], classAvg = 60) {
  return render(
    <I18nextProvider i18n={i18n}>
      <ClassField students={students} nameFor={nameFor} classAvg={classAvg} />
    </I18nextProvider>,
  );
}

const ATTENTIVE = 80;
const DRIFTING = CMF.liveAttentionAlertBelow - 10; // below the cmfConfig cutoff

describe('ClassField (teacher ambient field)', () => {
  it('renders an orb per student with name + exact %, plus the class average', () => {
    renderField([mk('a', ATTENTIVE), mk('b', DRIFTING)]);
    expect(screen.getByText('Аня')).toBeInTheDocument();
    expect(screen.getByText('Боря')).toBeInTheDocument();
    expect(screen.getByText(`${ATTENTIVE}%`)).toBeInTheDocument();
    expect(screen.getByText(`${DRIFTING}%`)).toBeInTheDocument();
    expect(screen.getByText(/Среднее по классу/)).toBeInTheDocument();
  });

  it('tags ONLY the student below the cmfConfig cutoff with «нужно внимание» (text, not color-only)', () => {
    renderField([mk('a', ATTENTIVE), mk('b', DRIFTING)]);
    expect(screen.getAllByText('нужно внимание')).toHaveLength(1);
  });

  it('«Скрыть имена» hides names but keeps the values; toggle is a pressed button', () => {
    renderField([mk('a', ATTENTIVE)]);
    const toggle = screen.getByRole('button', { name: /Скрыть имена/ });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(toggle);
    expect(screen.queryByText('Аня')).not.toBeInTheDocument();
    expect(screen.getByText(`${ATTENTIVE}%`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Показать имена/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows the waiting note when no students have reported yet', () => {
    renderField([]);
    expect(screen.getByText(/Ожидаем данные от учеников/)).toBeInTheDocument();
  });

  it('clicking an orb reveals THAT student’s sub-metrics (aria-expanded flips); re-click collapses', () => {
    renderField([mk('a', ATTENTIVE, { gaze: 84, alert: 77, headYaw: 6, headPitch: -3 })]);
    const orb = screen.getByRole('button', { name: /Аня/ });
    expect(orb).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Взгляд на экране')).not.toBeInTheDocument();

    fireEvent.click(orb);
    expect(screen.getByRole('button', { name: /Аня/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Взгляд на экране')).toBeInTheDocument();
    expect(screen.getByText('84 %')).toBeInTheDocument(); // reuses the strip Meter grammar
    expect(screen.getByText('в кадре')).toBeInTheDocument(); // head in tolerance (cmfConfig)

    fireEvent.click(screen.getByRole('button', { name: /Аня/ }));
    expect(screen.getByRole('button', { name: /Аня/ })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Взгляд на экране')).not.toBeInTheDocument();
  });

  it('opens only ONE student at a time, and Esc collapses', () => {
    renderField([mk('a', ATTENTIVE), mk('b', ATTENTIVE)]);
    fireEvent.click(screen.getByRole('button', { name: /Аня/ }));
    expect(screen.getByRole('button', { name: /Аня/ })).toHaveAttribute('aria-expanded', 'true');

    // opening Боря collapses Аня (single selection)
    fireEvent.click(screen.getByRole('button', { name: /Боря/ }));
    expect(screen.getByRole('button', { name: /Боря/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /Аня/ })).toHaveAttribute('aria-expanded', 'false');

    // Esc collapses the open one
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('button', { name: /Боря/ })).toHaveAttribute('aria-expanded', 'false');
  });
});
