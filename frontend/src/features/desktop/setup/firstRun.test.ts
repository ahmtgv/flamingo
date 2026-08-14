import { describe, expect, it } from 'vitest';

import {
  canLeaveCabinetStep,
  canLeaveCheckStep,
  channelVerdict,
  countdown,
  formatPairingCode,
  SETUP_STEPS,
  stepFromNumber,
  stepNumber,
} from './firstRun';

describe('первый запуск — пять шагов (лист D2)', () => {
  it('шаги нумеруются в обе стороны одинаково', () => {
    for (const step of SETUP_STEPS) {
      expect(stepFromNumber(stepNumber(step))).toBe(step);
    }
    expect(SETUP_STEPS).toHaveLength(5);
  });

  it('чужое число не роняет мастер, а прижимается к краю', () => {
    // «Приложение вернёт на тот же шаг» — включая случай, когда на сервере число из будущей
    // версии. Открыться на первом шаге хуже, чем на последнем известном, но не сломано.
    expect(stepFromNumber(0)).toBe('pairing');
    expect(stepFromNumber(99)).toBe('done');
  });
});

describe('🔴 копия обязательна (§19.1)', () => {
  it('без настроенной копии шаг 2 не покидается', () => {
    // Единственное место в продукте, где мы заставляем. Ноутбук держит работы и оценки
    // живых детей, и второй копии у них нет.
    expect(canLeaveCabinetStep(null)).toBe(false);
    expect(canLeaveCabinetStep(undefined)).toBe(false);
    expect(canLeaveCabinetStep('NONE')).toBe(false);
  });

  it('любая настоящая копия — годится', () => {
    expect(canLeaveCabinetStep('EXTERNAL_DISK')).toBe(true);
    expect(canLeaveCabinetStep('CLOUD_FOLDER')).toBe(true);
  });
});

describe('🔴 слабый канал предупреждает, но не запрещает (§19.3)', () => {
  it('шаг 4 покидается при любом вердикте, включая «не годится»', () => {
    // Решение остаётся за преподавателем: он знает, что за урок и что за дети. Продукт,
    // отказывающийся начать занятие по оценке полосы, принял решение не за себя.
    expect(canLeaveCheckStep()).toBe(true);
  });

  it('вердикт — размер группы, а не скорость', () => {
    // «Это то, чем преподаватель распоряжается: расписание он менять умеет, а битрейт нет.»
    expect(channelVerdict('COMFORTABLE', 8)).toEqual({ groupSize: 8, tone: 'good' });
    expect(channelVerdict('WORKABLE', 4)).toEqual({ groupSize: 4, tone: 'weak' });
    expect(channelVerdict('TIGHT', 2)).toEqual({ groupSize: 2, tone: 'weak' });
    expect(channelVerdict('TOO_WEAK', 0)).toEqual({ groupSize: 0, tone: 'unusable' });
  });

  it('неизмеренный канал не выдаёт себя за измеренный', () => {
    expect(channelVerdict('UNKNOWN', 0).tone).toBe('unusable');
  });
});

describe('код связывания', () => {
  it('читается двумя половинами — его переносят через комнату', () => {
    expect(formatPairingCode('k7m4q2')).toBe('K7M · 4Q2');
  });

  it('нестандартную длину не калечит', () => {
    expect(formatPairingCode('ABC')).toBe('ABC');
  });

  it('обратный отсчёт показывает минуты и секунды', () => {
    expect(countdown(9 * 60_000 + 41_000)).toBe('9:41');
    expect(countdown(5_000)).toBe('0:05');
    expect(countdown(-1)).toBe('0:00');
  });
});
