import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/shared/ui';

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
  /*
   * 🔴 КАДР БЫЛ ПУСТ ВСЕГДА (наряд 47 §6). `setStream` публиковался ДО `setState('live')`,
   * а `<video>` рисуется только при `live`. Эффект привязки с зависимостью `[media.stream]`
   * отрабатывал, когда элемента ещё не существовало, и больше не вызывался — `srcObject`
   * не проставлялся никогда. Человек видел серый прямоугольник при горящей камере.
   *
   * Callback-ref решает это по построению: он срабатывает в тот момент, когда элемент
   * появляется, — то есть заведомо после потока. Тот же приём в `VideoRoom`.
   */
  const attachVideo = useCallback(
    (el: HTMLVideoElement | null) => {
      if (!el) return;
      if (media.stream) el.srcObject = media.stream;
      // В WKWebView одного `srcObject` мало: `autoPlay` там не срабатывает для потока, и
      // превью остаётся серым при живой камере (найдено владельцем 16.08).
      //
      // ⚠️ `play()` бывает и не промисом: в jsdom он бросает синхронно. Ссылочный обработчик,
      // который бросает, уносит с собой всё дерево — экран исчезает целиком. Ловим оба вида.
      try {
        void el.play()?.catch?.(() => undefined);
      } catch {
        /* среда без воспроизведения — превью не главное, экран важнее */
      }
    },
    [media.stream],
  );
  const [probing, setProbing] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [left, setLeft] = useState(PROBE_SECONDS);
  const [result, setResult] = useState<{ verdict: UplinkVerdict; groupSize: number } | null>(null);

  /*
   * 🔴 КАМЕРА ВКЛЮЧАЕТСЯ НАЖАТИЕМ, А НЕ САМА (наряд 48 §2, формулировка дизайнера).
   *
   * Здесь стоял `void media.start()` при монтировании. Замерено 23.08: два обращения к
   * камере и микрофону сразу по приходе на шаг, зелёный индикатор macOS горит — а на экране
   * ни строки о том, куда идут кадры. Система сообщала то, чего не сообщил продукт.
   *
   * Проверка при этом остаётся настоящей (промпт 21 §3.2): не `enumerateDevices()`, который
   * до разрешения отдаёт список без названий, а честный запрос — но по нажатию человека.
   */

  // Превью — локальное, поток наружу не уходит (CLAUDE.md §2.1); привязка — в `attachVideo`.

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
        {/* До нажатия — тёмный кадр и приглашение. Зелёная заливка сюда не идёт (§57):
            главное действие шага — «Дальше», а не «включить камеру». */}
        {media.state !== 'live' && (
          <div className={styles.preview}>
            <div className={styles.previewDark}>
              <Button
                variant="secondary"
                onClick={() => void media.start()}
                loading={media.state === 'asking'}
              >
                {t('setup.check.turnOn')}
              </Button>
              <p className={styles.note}>{t('setup.check.beforeOn')}</p>
            </div>
          </div>
        )}

        {media.state === 'live' && (
          <div className={styles.preview}>
            {media.cameras.length > 0 ? (
              <div className={styles.frame}>
                <video ref={attachVideo} className={styles.previewVideo} autoPlay muted playsInline />
                {/* 🔴 ПОКАЗАТЕЛЬ ПРИВАТНОСТИ — ВМЕСТЕ С КАРТИНКОЙ, ВНИЗУ КАДРА.
                    `CLAUDE.md §7` требует его на каждом экране с камерой, и это первый
                    экран после установки. Точка 500 + надпись 300 (правило 4.10:
                    индикатор — значащая графика, порог 3,0, считается парой с кадром). */}
                <p className={styles.onDevice} role="status">
                  <i className={styles.onDeviceDot} aria-hidden="true" />
                  {t('setup.check.onDevice')}
                </p>
              </div>
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
