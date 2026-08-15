import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useReportUplinkMutation } from '@/entities/graphql/generated';
import type { UplinkVerdict } from '@/entities/graphql/generated';

import { measureUplink, PROBE_SECONDS, REQUIRED_MBPS } from '../uplinkProbe';

import { canLeaveCheckStep, channelVerdict } from './firstRun';
import { rememberDevices } from './mediaPreference';
import { useMediaCheck } from './useMediaCheck';
import { openSystemPrivacy, playTestSound } from './mediaHelpers';
import { stepFailureKey } from './stepFailure';
import styles from './setup.module.css';

/**
 * Шаг 4 — камера, микрофон и канал (atlas D2, OWNER_SCOPE §19.3).
 *
 * Two decisions shape this screen and both are the owner's.
 *
 * **The verdict is a group size, not a speed.** «Мы не показываем "интернет хороший", мы
 * показываем размер группы: вдвоём, четверо, восемь. Это то, чем преподаватель распоряжается —
 * расписание он менять умеет, а битрейт нет.» The megabits live in the settings screen.
 *
 * 🔴 **Предупреждаем, не запрещаем (§19.3).** Nothing here blocks anything — not this step,
 * not creating a lesson, not the lesson. A weak channel produces a smaller suggested group and
 * a suggestion to use a cable; the teacher decides, because they know what the lesson is and
 * who the children are.
 */
export function CheckStep({ onNext }: { onNext: () => void }) {
  const { t } = useTranslation('desktop');
  const [report] = useReportUplinkMutation();

  const media = useMediaCheck();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [probing, setProbing] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [left, setLeft] = useState(PROBE_SECONDS);
  const [result, setResult] = useState<{ verdict: UplinkVerdict; groupSize: number } | null>(null);

  // 🔴 Проверка, а не перечисление (промпт 21 §3.2). Раньше экран звал `enumerateDevices()`
  // и на этом успокаивался — а до выдачи разрешения этот список приходит без названий, часто
  // пустой. Отсюда «Камера не найдена» на маке со встроенной камерой. Теперь спрашиваем
  // разрешение по-настоящему: человек видит себя и видит, что микрофон слышит.
  useEffect(() => {
    void media.start();
    // start стабилен по ссылке; повторный запрос разрешения нам не нужен и не поможет —
    // macOS показывает системное окно один раз за жизнь приложения.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Превью — локальное, поток наружу не уходит (CLAUDE.md §2.1).
  useEffect(() => {
    if (videoRef.current && media.stream) videoRef.current.srcObject = media.stream;
  }, [media.stream]);

  // Выбор запоминается: урок откроет именно эти устройства.
  useEffect(() => {
    if (media.state === 'live') rememberDevices(media.cameraId, media.micId);
  }, [media.state, media.cameraId, media.micId]);

  const probe = async () => {
    setProbing(true);
    setLeft(PROBE_SECONDS);
    const tick = window.setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    const measured = await measureUplink();
    window.clearInterval(tick);
    setProbing(false);
    setFailed(null);
    try {
      const { data } = await report({
        variables: { mbps: measured.mbps, connectionType: measured.connectionType },
      });
      const uplink = data?.reportUplink?.uplink;
      if (uplink) setResult({ verdict: uplink.verdict, groupSize: uplink.groupSize });
      else setFailed('common:failure.unknown');
    } catch (error) {
      // Замер прошёл, а вердикт даёт сервер. Без него на экране осталась бы крутилка,
      // закончившаяся ничем.
      setFailed(stepFailureKey(error));
    }
  };

  const verdict = result ? channelVerdict(result.verdict, result.groupSize) : null;

  return (
    <div className={styles.step}>
      <h2 className={styles.h}>{t('setup.check.title')}</h2>
      <p className={styles.p}>{t('setup.check.body')}</p>

      <div className={styles.card}>
        <span className={styles.cardTitle}>{t('setup.check.devicesTitle')}</span>

        {/* 🔴 Видно себя. Прежний экран показывал текст о том, найдена ли камера; человек
            узнавал, что она не та или смотрит в потолок, уже на уроке. */}
        {media.state === 'live' && (
          <div className={styles.preview}>
            {media.cameras.length > 0 ? (
              <video ref={videoRef} className={styles.previewVideo} autoPlay muted playsInline />
            ) : (
              <p className={styles.note}>{t('setup.check.cameraMissing')}</p>
            )}

            {/* Виден звук: полоса шевелится, когда говорят. Считается на устройстве. */}
            <div className={styles.levelRow}>
              <span className={styles.note}>{t('setup.check.micLabel')}</span>
              <div
                className={styles.level}
                role="meter"
                aria-label={t('setup.check.micLabel')}
                aria-valuenow={Math.round(media.level * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className={styles.levelFill} style={{ width: `${media.level * 100}%` }} />
              </div>
              <span className={styles.note}>{t('setup.check.speakIntoIt')}</span>
            </div>
          </div>
        )}

        {media.state === 'asking' && <p className={styles.note}>{t('setup.check.asking')}</p>}

        {/* ⚠️ Отказали — система больше не спросит. Кнопка «ещё раз» тут была бы ложью. */}
        {media.state === 'denied' && (
          <>
            <p className={styles.warn}>{t('setup.check.denied')}</p>
            <button
              type="button"
              className={styles.btnGhost}
              onClick={() => openSystemPrivacy('camera')}
            >
              {t('setup.check.openPrivacy')}
            </button>
          </>
        )}

        {media.state === 'missing' && <p className={styles.warn}>{t('setup.check.noDevices')}</p>}
        {media.state === 'failed' && <p className={styles.warn}>{t('common:failure.unknown')}</p>}

        {media.state === 'live' && (
          <div className={styles.pickers}>
            {media.cameras.length > 1 && (
              <label className={styles.picker}>
                <span className={styles.note}>{t('setup.check.pickAnother')}</span>
                <select
                  value={media.cameraId ?? ''}
                  onChange={(e) => media.pick('camera', e.target.value)}
                >
                  {media.cameras.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {media.mics.length > 1 && (
              <label className={styles.picker}>
                <span className={styles.note}>{t('setup.check.micLabel')}</span>
                <select value={media.micId ?? ''} onChange={(e) => media.pick('mic', e.target.value)}>
                  {media.mics.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              type="button"
              className={styles.btnGhost}
              onClick={() => void playTestSound(media.speakerId)}
            >
              {t('setup.check.testSound')}
            </button>
          </div>
        )}
      </div>

      <div className={styles.card}>
        <span className={styles.cardTitle}>{t('setup.check.channelTitle')}</span>

        <output className={styles.verdict} data-tone={verdict?.tone ?? 'none'} aria-live="polite">
          {probing
            ? t('setup.check.measuring', { left })
            : verdict === null
              ? t('setup.check.unmeasured')
              : verdict.tone === 'good'
                ? t('setup.check.good')
                : verdict.tone === 'weak'
                  ? t('setup.check.weak', { count: verdict.groupSize })
                  : t('setup.check.unusable')}
        </output>

        <p className={styles.note}>{t('setup.check.explain')}</p>

        <ul className={styles.needs}>
          <li>
            <b>{t('setup.check.need2')}</b>
            <small>{t('setup.check.needValue', { mbps: REQUIRED_MBPS[2] })}</small>
          </li>
          <li>
            <b>{t('setup.check.need4')}</b>
            <small>{t('setup.check.needValue', { mbps: REQUIRED_MBPS[4] })}</small>
          </li>
          <li>
            <b>{t('setup.check.need8')}</b>
            <small>{t('setup.check.needValue', { mbps: REQUIRED_MBPS[8] })}</small>
          </li>
        </ul>

        <div className={styles.row}>
          <button
            type="button"
            className={styles.btnGhost}
            disabled={probing}
            onClick={() => void probe()}
          >
            {result ? t('setup.check.again') : t('setup.check.measure')}
          </button>
        </div>
        <p className={styles.note}>{t('setup.check.numbersLater')}</p>
      </div>

      <details className={styles.why}>
        <summary>{t('setup.check.whyTitle')}</summary>
        <p className={styles.note}>{t('setup.check.why')}</p>
      </details>

      {/* 🔴 §19.3 — кнопка не заблокирована ни при каком вердикте, включая «не годится». */}
      {/* Причина словами — на каждом шаге, а не только на первом. */}
      {failed && (
        <p className={styles.warn} role="alert">
          {t(failed)}
        </p>
      )}

      <button
        type="button"
        className={styles.btn}
        disabled={!canLeaveCheckStep()}
        onClick={onNext}
      >
        {t('setup.next')}
      </button>
    </div>
  );
}
