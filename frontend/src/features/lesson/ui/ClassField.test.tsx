import { fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it } from 'vitest';

import i18n from '@/i18n';
import { CMF } from '@/seedum/cmfConfig';

import { ClassField, type FieldStudent } from './ClassField';

const NAMES: Record<string, string> = { a: 'Аня', b: 'Боря' };
const nameFor = (id: string) => NAMES[id] ?? id;

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
    renderField([
      { id: 'a', value: ATTENTIVE },
      { id: 'b', value: DRIFTING },
    ]);
    expect(screen.getByText('Аня')).toBeInTheDocument();
    expect(screen.getByText('Боря')).toBeInTheDocument();
    expect(screen.getByText(`${ATTENTIVE}%`)).toBeInTheDocument();
    expect(screen.getByText(`${DRIFTING}%`)).toBeInTheDocument();
    expect(screen.getByText(/Среднее по классу/)).toBeInTheDocument();
  });

  it('tags ONLY the student below the cmfConfig cutoff with «нужно внимание» (text, not color-only)', () => {
    renderField([
      { id: 'a', value: ATTENTIVE },
      { id: 'b', value: DRIFTING },
    ]);
    expect(screen.getAllByText('нужно внимание')).toHaveLength(1);
  });

  it('«Скрыть имена» hides names but keeps the values (projection mode); toggle is a pressed button', () => {
    renderField([{ id: 'a', value: ATTENTIVE }]);
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
});
