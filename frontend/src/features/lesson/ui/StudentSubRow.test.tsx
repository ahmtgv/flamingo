import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it } from 'vitest';

import i18n from '@/i18n';
import { CMF } from '@/seedum/cmfConfig';

import { StudentSubRow } from './StudentSubRow';
import { EMPTY_SUB, type StudentSubMetrics } from './subMetrics';

function renderRow(m: StudentSubMetrics) {
  return render(
    <I18nextProvider i18n={i18n}>
      <StudentSubRow m={m} />
    </I18nextProvider>,
  );
}

const live: StudentSubMetrics = { gaze: 84, eyes: 91, alert: 77, yaw: 6, pitch: -3 };

describe('StudentSubRow (teacher per-student strip)', () => {
  it('shows gaze / alertness / eyes-open values with accessible labels', () => {
    renderRow(live);
    expect(screen.getByText('84%')).toBeInTheDocument();
    expect(screen.getByText('77%')).toBeInTheDocument();
    expect(screen.getByText('91%')).toBeInTheDocument();
    expect(screen.getByLabelText('Взгляд: 84%')).toBeInTheDocument();
    expect(screen.getByLabelText('Бодрость: 77%')).toBeInTheDocument();
    expect(screen.getByLabelText('Глаза: 91%')).toBeInTheDocument();
  });

  it('reads head "in frame" within the cmfConfig tolerance', () => {
    renderRow(live);
    expect(screen.getByText('в кадре')).toBeInTheDocument();
    expect(screen.getByLabelText('Положение головы: в кадре')).toBeInTheDocument();
  });

  it('reads head "out of frame" past the cmfConfig tolerance (calm accent, not alarm)', () => {
    renderRow({ ...live, yaw: CMF.headYawToleranceDeg + 10 });
    expect(screen.getByText('вне кадра')).toBeInTheDocument();
  });

  it('renders «—» / unknown for a missing reading — never a false "in frame"', () => {
    renderRow(EMPTY_SUB);
    expect(screen.getAllByText('—')).toHaveLength(3);
    expect(screen.getByText('нет данных')).toBeInTheDocument();
    expect(screen.queryByText('в кадре')).not.toBeInTheDocument();
  });
});
