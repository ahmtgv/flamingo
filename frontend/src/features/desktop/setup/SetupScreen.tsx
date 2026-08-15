import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useMeQuery, useThisDeviceQuery } from '@/entities/graphql/generated';

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
  // 🔴 Прогресс машины спрашивается ЕЮ САМОЙ (`thisDevice`), а не через `myDevices`: тот
  // требует пользовательской сессии, которой в приложении нет и не будет (§19.4). Пока здесь
  // стоял `myDevices`, обещание экрана «приложение вернёт на тот же шаг» было ложным —
  // перезапуск всегда возвращал на шаг 1.
  const { data: devicesData, refetch } = useThisDeviceQuery();

  // Прогресс машины — с сервера; локальный шаг ведёт мастер, пока идёт сессия.
  const machine = devicesData?.thisDevice;
  const [local, setLocal] = useState<SetupStep | null>(null);
  // TEMPORARY: витрина (VITE_PREVIEW=1) показывает лист целиком, поэтому открывается с первого
  // шага. В приложении мастер возвращает на пройденный — «сделанное сохраняется». Уходит
  // вместе с демо-слоем.
  // Как далеко машина дошла НА САМОМ ДЕЛЕ — с сервера. Это не то же, что показанный шаг:
  // вернувшись на второй, человек остаётся дошедшим до четвёртого.
  const reached: SetupStep = stepFromNumber(machine?.setup?.step ?? 1);
  const resumed: SetupStep = IS_PREVIEW ? 'pairing' : reached;
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
        {/* 🔴 Возврат на пройденный шаг (OWNER_SCOPE §26.3). Экран обещает «приложение вернёт
            на тот же шаг», но вернуться НАЖАТИЕМ было нельзя: рельс только показывал.
            Зелёный шаг открывается, непройденный — нет: он ещё не наступил, и кнопка, ведущая
            в никуда, хуже её отсутствия. `advanceDeviceSetup` монотонен, поэтому возврат
            ничего не забывает. */}
        <ol className={styles.steps}>
          {SETUP_STEPS.map((id) => {
            const state = stateOf(id, step);
            // 🔴 Открываемость считается от ДОСТИГНУТОГО шага, а не от показанного. Иначе
            // возврат становится ловушкой: вернулся на второй — и третий с четвёртым, которые
            // ты уже прошёл, перестали быть зелёными и вперёд не пускают.
            // На витрине открыты все — иначе лист D2 не посмотреть (связывание там мгновенно).
            const openable = IS_PREVIEW || stepNumber(id) <= stepNumber(reached);
            return (
              <li key={id} className={styles.stepItem} data-state={state}>
                <span className={styles.stepNo}>{stepNumber(id)}</span>
                {openable ? (
                  <button
                    type="button"
                    className={styles.railJump}
                    aria-current={state === 'now' ? 'step' : undefined}
                    onClick={() => setLocal(id)}
                  >
                    <b>{t(`setup.steps.${id}.title`)}</b>
                    <small>{t(`setup.steps.${id}.hint`)}</small>
                  </button>
                ) : (
                  <span aria-current={state === 'now' ? 'step' : undefined}>
                    <b>{t(`setup.steps.${id}.title`)}</b>
                    <small>{t(`setup.steps.${id}.hint`)}</small>
                  </span>
                )}
              </li>
            );
          })}
        </ol>
        <p className={styles.railNote}>{t('setup.resume')}</p>
        {/* Правда, которая стоит того, чтобы быть на экране: до шага 3 ничего не уходит. */}
        <p className={styles.railNote}>{t('setup.nothingSent')}</p>
      </aside>

      <main className={styles.body}>
        <span className={styles.of}>{t('setup.of', { n: stepNumber(step) })}</span>

        {step === 'pairing' && <PairingStep onPaired={() => go('cabinet')} />}
        {step === 'cabinet' && <CabinetStep onNext={() => go('consents')} />}
        {step === 'consents' && (
          <ConsentStep onNext={() => go('check')} consent152fzAt={me?.consent152fzAt} />
        )}
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
