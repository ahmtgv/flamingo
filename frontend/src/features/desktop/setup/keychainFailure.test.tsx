import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ClaimDeviceTokenDocument,
  RequestPairingCodeDocument,
} from '@/entities/graphql/generated';
import { clearSession, getSessionSnapshot } from '@/shared/lib/session';
import { renderWithProviders } from '@/test/renderWithProviders';

import { PairingStep } from './PairingStep';

/**
 * 🔴 КЛЮЧ МАШИНЫ НЕ СОХРАНИЛСЯ — И МАСТЕР ОБ ЭТОМ ГОВОРИТ (промпт 21 §2.5).
 *
 * Находка владельца утром 16.08. Связывание проходило, мастер уходил на шаг 2, и там —
 * «Сервер не принял запрос». Про причину, случившуюся ШАГОМ РАНЬШЕ и совсем в другом месте:
 *
 *     security find-generic-password -s plus.flamingo.desktop
 *     → The specified item could not be found in the keychain
 *
 * Ключа не было ни в связке, ни в памяти: `rememberMachineKey` при ошибке возвращает `false`
 * и НЕ зовёт `setInMemoryKey`, а вызов стоял без проверки результата:
 *
 *     await rememberMachineKey(token);   // ← результат игнорировался
 *
 * Третий молчащий отказ за три дня, и на этот раз он маскировался под чужую поломку —
 * человек шёл искать её в сервер, которого она не касалась.
 *
 * ⚠️ Тест держит ПОВЕДЕНИЕ: не сохранили — со шага 1 не ушли и сказали почему.
 */

const mockRemember = vi.fn<(token: string) => Promise<boolean>>();

vi.mock('../machineKey', () => ({
  rememberMachineKey: (token: string) => mockRemember(token),
  machineKeyInMemory: () => null,
  primeMachineKey: () => Promise.resolve(false),
}));

vi.mock('../bridge', () => ({
  APP_VERSION: '0.1.0',
  isDesktop: () => true,
  openExternal: () => Promise.resolve(true),
  copyText: () => Promise.resolve(true),
}));

const CODE = 'E24NBK';

const mocks = [
  {
    request: {
      query: RequestPairingCodeDocument,
      // ⚠️ Значения — те, что шлёт компонент В ЭТОМ прогоне: jsdom не притворяется маком,
      // и `navigator.userAgent.includes('Mac')` здесь ложно. Мок с «Mac» не совпал бы с
      // запросом, claim не дошёл бы до дела, и все четыре теста падали бы по таймауту —
      // ровно так первая версия и падала.
      variables: {
        deviceName: navigator.userAgent.includes('Mac') ? 'Mac' : 'ПК',
        platform: navigator.userAgent.includes('Mac') ? 'MACOS' : 'OTHER',
        appVersion: '0.1.0',
      },
    },
    result: {
      data: {
        requestPairingCode: {
          __typename: 'PairingRequest',
          code: CODE,
          secret: 'секрет',
          expiresAt: new Date(Date.now() + 9 * 60_000).toISOString(),
        },
      },
    },
    maxUsageCount: 5,
  },
  {
    request: { query: ClaimDeviceTokenDocument, variables: { code: CODE, secret: 'секрет' } },
    result: {
      data: {
        claimDeviceToken: {
          __typename: 'DeviceClaim',
          token: 'ключ-машины',
          session: {
            __typename: 'DeviceSession',
            token: 'access',
            refreshToken: 'refresh',
            displayName: 'Ирина',
          },
          device: null,
        },
      },
    },
    maxUsageCount: 5,
  },
];

afterEach(() => {
  mockRemember.mockReset();
  clearSession();
});

describe('связка ключей отказала', () => {
  it('🔴 мастер НЕ уходит со шага 1 и называет причину', { timeout: 20_000 }, async () => {
    mockRemember.mockResolvedValue(false);
    let paired = false;
    renderWithProviders(<PairingStep onPaired={() => (paired = true)} />, {
      mocks,
      route: '/setup',
    });

    // Опрос подтверждения идёт раз в две секунды; ждём, пока claim отработает.
    expect(await screen.findByRole('alert', {}, { timeout: 6000 })).toHaveTextContent(
      /ключ этой машины не удалось сохранить/i,
    );
    expect(paired).toBe(false);
  });

  it('🔴 и сессию при этом не оставляет — иначе кабинет открылся бы без права вести урок', { timeout: 20_000 }, async () => {
    // Ключа нет, значит машина не связана. Сессия, положенная «заодно», сделала бы
    // состояние противоречивым: кабинет открыт, а шаги 2–5 отказывают.
    mockRemember.mockResolvedValue(false);
    renderWithProviders(<PairingStep onPaired={() => {}} />, { mocks, route: '/setup' });

    await screen.findByRole('alert', {}, { timeout: 6000 });

    expect(getSessionSnapshot().status).not.toBe('authenticated');
  });

  it('связка приняла ключ — мастер идёт дальше', { timeout: 20_000 }, async () => {
    mockRemember.mockResolvedValue(true);
    let paired = false;
    renderWithProviders(<PairingStep onPaired={() => (paired = true)} />, {
      mocks,
      route: '/setup',
    });

    await waitFor(() => expect(paired).toBe(true), { timeout: 6000 });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('ключ отдаётся связке ровно тот, что пришёл с сервера', { timeout: 20_000 }, async () => {
    mockRemember.mockResolvedValue(true);
    renderWithProviders(<PairingStep onPaired={() => {}} />, { mocks, route: '/setup' });

    await waitFor(() => expect(mockRemember).toHaveBeenCalledWith('ключ-машины'), {
      timeout: 6000,
    });
  });
});
