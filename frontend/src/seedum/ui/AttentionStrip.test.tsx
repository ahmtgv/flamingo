import { fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it } from 'vitest';

import i18n from '@/i18n';

import type { BucketAggregate } from '../attention';
import { CMF } from '../cmfConfig';

import { AttentionStrip } from './AttentionStrip';

function renderStrip(bucket: BucketAggregate | null, status: 'starting' | 'running' | 'unavailable') {
  return render(
    <I18nextProvider i18n={i18n}>
      <AttentionStrip bucket={bucket} status={status} />
    </I18nextProvider>,
  );
}

const live: BucketAggregate = {
  avgAttention: 72,
  gazeOnScreen: 84,
  eyeOpenness: 91,
  headYaw: 6,
  headPitch: -3,
  alertness: 77,
};

describe('AttentionStrip (student attention strip)', () => {
  it('collapsed by default: shows «Внимание» + the engagement number, sub-metrics hidden', () => {
    renderStrip(live, 'running');
    expect(screen.getByText('Внимание')).toBeInTheDocument();
    expect(screen.getByText('72')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Взгляд на экране')).not.toBeInTheDocument();
  });

  it('chevron expands the four sub-metrics downward (aria-expanded flips)', () => {
    renderStrip(live, 'running');
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Взгляд на экране')).toBeInTheDocument();
    expect(screen.getByText('Глаза открыты')).toBeInTheDocument();
    expect(screen.getByText('Голова в кадре')).toBeInTheDocument();
    expect(screen.getByText('Бодрость')).toBeInTheDocument();
    expect(screen.getByText('84 %')).toBeInTheDocument();
    expect(screen.getByText('77 %')).toBeInTheDocument();
    // head row reads in/out from headState (cmfConfig), as text — never a 0..100 value
    expect(screen.getByText('в кадре')).toBeInTheDocument();
  });

  it('head row reads «вне кадра» past the cmfConfig tolerance', () => {
    renderStrip({ ...live, headYaw: CMF.headYawToleranceDeg + 10 }, 'running');
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('вне кадра')).toBeInTheDocument();
  });

  it('shows «—» before the first reading and «Анализ недоступен» when CMF is unavailable', () => {
    const { rerender } = renderStrip(null, 'starting');
    expect(screen.getByText('—')).toBeInTheDocument();
    rerender(
      <I18nextProvider i18n={i18n}>
        <AttentionStrip bucket={null} status="unavailable" />
      </I18nextProvider>,
    );
    expect(screen.getByText('Анализ недоступен')).toBeInTheDocument();
  });
});
