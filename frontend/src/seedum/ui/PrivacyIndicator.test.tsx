import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it } from 'vitest';

import i18n from '@/i18n';

import { PrivacyIndicator } from './PrivacyIndicator';

describe('PrivacyIndicator', () => {
  it('renders the on-device guarantee on camera screens', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <PrivacyIndicator />
      </I18nextProvider>,
    );
    expect(screen.getByText(/видео не покидает устройство/)).toBeInTheDocument();
  });
});
