import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useMeQuery, useMyDevicesQuery } from '@/entities/graphql/generated';

import { CabinetStep } from './CabinetStep';
import { CheckStep } from './CheckStep';
import { ConsentStep } from './ConsentStep';
import { DoneStep } from './DoneStep';
import { PairingStep } from './PairingStep';
import { SETUP_STEPS, type SetupStep, stepFromNumber, stepNumber } from './firstRun';
import styles from './setup.module.css';

const IS_PREVIEW = import.meta.env.VITE_PREVIEW === '1';

/**
 * Первый запуск — atlas D2 (Р5.4).
 *
 * The only screen a teacher sees **before** they decide whether to trust the product, and the
 * sheet's warning about it is the whole brief: «Если здесь спросить лишнее или напугать —
 * второго шанса не будет. Поэтому шагов пять, каждый отвечает ровно на один вопрос, и ни один
 * не спрашивает того, что можно узнать самим.»
 *
 * Resumable, because setup gets interrupted by life: the step reached is on the machine's own
 * row and the wizard opens where it left off — «сделанное сохраняется, приложение вернёт на
 * тот же шаг».
 */
export function SetupScreen({ onFinished }: { onFinished: () => void }) {
  const { t } = useTranslation('desktop');
  const { data: meData } = useMeQuery();
  const { data: devicesData, refetch } = useMyDevicesQuery();

  // Прогресс машины — с сервера; локальный шаг ведёт мастер, пока идёт сессия.
  const machine = devicesData?.myDevices?.[0];
  const [local, setLocal] = useState<SetupStep | null>(null);
  // TEMPORARY: витрина (VITE_PREVIEW=1) показывает лист целиком, поэтому открывается с первого
  // шага. В приложении мастер возвращает на пройденный — «сделанное сохраняется». Уходит
  // вместе с демо-слоем.
  const resumed = IS_PREVIEW ? 'pairing' : stepFromNumber(machine?.setup?.step ?? 1);
  const step: SetupStep = local ?? resumed;

  const me = meData?.me;
  const teacherName = me?.displayName ?? '';
  const groupSize = machine?.uplink?.groupSize ?? null;

  const go = (next: SetupStep) => {
    setLocal(next);
    void refetch();
  };

  return (
    <div className={styles.screen}>
      <aside className={styles.rail}>
        <span className={styles.railTitle}>{t('setup.title')}</span>
        <ol className={styles.steps}>
          {SETUP_STEPS.map((id) => (
            <li key={id} className={styles.stepItem} data-state={stateOf(id, step)}>
              <span className={styles.stepNo}>{stepNumber(id)}</span>
              {/* TEMPORARY: на витрине шаги кликабельны, иначе лист D2 не посмотреть — связывание
                  в демо подтверждается мгновенно. В приложении рельс только показывает. */}
              {IS_PREVIEW ? (
                <button type="button" className={styles.railJump} onClick={() => setLocal(id)}>
                  <b>{t(`setup.steps.${id}.title`)}</b>
                  <small>{t(`setup.steps.${id}.hint`)}</small>
                </button>
              ) : (
                <span>
                  <b>{t(`setup.steps.${id}.title`)}</b>
                  <small>{t(`setup.steps.${id}.hint`)}</small>
                </span>
              )}
            </li>
          ))}
        </ol>
        <p className={styles.railNote}>{t('setup.resume')}</p>
        {/* Правда, которая стоит того, чтобы быть на экране: до шага 3 ничего не уходит. */}
        <p className={styles.railNote}>{t('setup.nothingSent')}</p>
      </aside>

      <main className={styles.body}>
        <span className={styles.of}>{t('setup.of', { n: stepNumber(step) })}</span>

        {step === 'pairing' && <PairingStep onPaired={() => go('cabinet')} />}
        {step === 'cabinet' && <CabinetStep onNext={() => go('consents')} />}
        {step === 'consents' && <ConsentStep onNext={() => go('check')} />}
        {step === 'check' && <CheckStep onNext={() => go('done')} />}
        {step === 'done' && (
          <DoneStep
            teacherName={teacherName}
            attentionOn={me?.consentAttention ?? false}
            groupSize={groupSize}
            onOpenCabinet={onFinished}
          />
        )}
      </main>
    </div>
  );
}

function stateOf(item: SetupStep, current: SetupStep): 'done' | 'now' | 'todo' {
  const a = stepNumber(item);
  const b = stepNumber(current);
  return a < b ? 'done' : a === b ? 'now' : 'todo';
}
