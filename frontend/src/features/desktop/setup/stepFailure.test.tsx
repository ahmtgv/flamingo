import type { DocumentNode } from 'graphql';

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import {
  CompleteDeviceSetupDocument,
  ConfigureCabinetBackupDocument,
} from '@/entities/graphql/generated';
import { renderWithProviders } from '@/test/renderWithProviders';

import { CabinetStep } from './CabinetStep';
import { DoneStep } from './DoneStep';

/**
 * 🔴 Ни один шаг мастера не проваливается молча (промпт 18 §Б0-тер).
 *
 * Находка владельца: на шаге 2 кнопка «Дальше» нажималась и не делала НИЧЕГО — ни перехода,
 * ни ошибки. Мутация падала, перехвата не было, экран молчал. И так на четырёх шагах сразу:
 * они написаны одинаково, и одинаково молчали.
 *
 * Кликнуть по настоящему окну приложения тест не может, поэтому держит то, что держать и
 * нужно: **нажатие, которое не сработало, обязано сказать причину, и переход не должен
 * состояться**. Проверяется поведением, а не наличием `try/catch` в исходнике.
 */

const networkError = (query: DocumentNode, variables: Record<string, unknown>) => ({
  request: { query, variables },
  error: new Error('сеть недоступна'),
});

describe('шаг мастера не молчит, когда не получилось', () => {
  it('шаг 2: «Дальше» при упавшей мутации показывает причину и НЕ уводит вперёд', async () => {
    let moved = false;
    renderWithProviders(<CabinetStep onNext={() => (moved = true)} />, {
      mocks: [
        networkError(ConfigureCabinetBackupDocument, { kind: 'EXTERNAL_DISK', cloudCopy: false }),
      ],
      route: '/setup',
    });

    await userEvent.click(screen.getByRole('button', { name: /Дальше/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/нет связи с сервером/i);
    // Переход не состоялся: мастер не делает вид, что шаг пройден.
    expect(moved).toBe(false);
  });

  it('шаг 5: «Готово» при упавшей мутации не запирает человека в настройке молча', async () => {
    let opened = false;
    renderWithProviders(
      <DoneStep
        teacherName="Люция Валерьевна"
        attentionOn={false}
        groupSize={8}
        onOpenCabinet={() => (opened = true)}
      />,
      { mocks: [networkError(CompleteDeviceSetupDocument, {})], route: '/setup' },
    );

    const finish = screen.getByRole('button', { name: /Открыть кабинет|Готово|Начать/ });
    await userEvent.click(finish);

    expect(await screen.findByRole('alert')).toHaveTextContent(/нет связи с сервером/i);
    expect(opened).toBe(false);
  });
});
