import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it } from 'vitest';

import i18n from '@/i18n';
import { CMF } from '@/seedum/cmfConfig';

import type { BucketAggregate } from '../attention';

import { AttentionBreakdown } from './AttentionBreakdown';

function renderBucket(bucket: BucketAggregate) {
  return render(
    <I18nextProvider i18n={i18n}>
      <AttentionBreakdown bucket={bucket} />
    </I18nextProvider>,
  );
}

const inFrame: BucketAggregate = {
  avgAttention: 80,
  gazeOnScreen: 84,
  eyeOpenness: 91,
  headYaw: 6,
  headPitch: -3,
  alertness: 77,
};

describe('AttentionBreakdown (student sub-metric breakdown)', () => {
  it('shows each sub-metric label + raw value with a labelled meter (no value-band verdict)', () => {
    renderBucket(inFrame);
    expect(screen.getByText('Взгляд на экране')).toBeInTheDocument();
    expect(screen.getByText('Открытость глаз')).toBeInTheDocument();
    expect(screen.getByText('Бодрость')).toBeInTheDocument();
    expect(screen.getByText('84 %')).toBeInTheDocument();
    expect(screen.getByText('91 %')).toBeInTheDocument();
    expect(screen.getByText('77 %')).toBeInTheDocument();
    // value is exposed to assistive tech via the meter's label — never color alone
    expect(screen.getByLabelText('Взгляд на экране: 84 из 100')).toBeInTheDocument();
  });

  it('reads head pose as "in frame" within the cmfConfig tolerance, with signed degrees', () => {
    renderBucket(inFrame);
    expect(screen.getByText('В кадре')).toBeInTheDocument();
    expect(screen.getByText('поворот +6° · наклон -3°')).toBeInTheDocument();
  });

  it('reads head pose as "turn to screen" past the cmfConfig tolerance', () => {
    renderBucket({ ...inFrame, headYaw: CMF.headYawToleranceDeg + 10, headPitch: 0 });
    expect(screen.getByText('Поверните к экрану')).toBeInTheDocument();
  });

  it('keeps the calm, encouraging, non-clinical framing', () => {
    renderBucket(inFrame);
    expect(screen.getByText(/Не оценка/)).toBeInTheDocument();
  });
});
