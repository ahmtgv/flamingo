import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { AttentionChart, PrivacyIndicator, startAttentionPipeline } from '@/seedum';
import { Button, Logo } from '@/shared/ui';

import styles from './demo.module.css';

/**
 * ДЕМО-КОМНАТА ДЛЯ ГОСТЯ — «Смотреть урок» с афиши (наряд 36 §3, решение владельца §34.9).
 *
 * 🔴 ДЕМО НЕ МОЖЕТ БЫТЬ ЗАПИСЬЮ УРОКА. `CLAUDE.md §2.2` запрещает хранить видео урока, аудио
 * и дословную расшифровку, и запрет не отменяется ради витрины. «Запишем один хороший урок и
 * будем показывать» — нельзя. Поэтому гость не смотрит чужое занятие, а **трогает продукт**:
 * рисует на доске и, если захочет, видит на СВОЕЙ камере, как работает разбор внимания.
 *
 * 🔒 БЕЗОПАСНОСТЬ ЗДЕСЬ СТРУКТУРНАЯ, А НЕ РАЗРЕШИТЕЛЬНАЯ (§3 «дверь снаружи»).
 *
 * Этот экран **не знает ни одного идентификатора занятия** и не делает ни одного запроса к
 * серверу — ни чтения, ни записи. Не «гостю запрещено писать», а **писать нечем**: до
 * настоящего занятия отсюда нельзя дотянуться ни угадыванием, ни подменой, потому что
 * дотягиваться неоткуда. Доска живёт в памяти вкладки; ушёл — не осталось ничего.
 *
 * 🔒 Камера — только по явному нажатию, и кадры не покидают устройство (§2.1): разбор идёт в
 * рабочем потоке браузера, наружу не уходит даже агрегат — в демо его некому слать.
 */

interface Stroke {
  id: number;
  points: number[];
}

export function DemoRoomScreen() {
  const { t } = useTranslation(['demo', 'seedum']);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const drawing = useRef<number[] | null>(null);
  const surface = useRef<SVGSVGElement>(null);
  const nextId = useRef(1);

  const [camera, setCamera] = useState<MediaStream | null>(null);
  const [cameraFailed, setCameraFailed] = useState(false);
  const [points, setPoints] = useState<number[]>([]);
  /**
   * 🔴 ПУСТОЙ ПРЯМОУГОЛЬНИК ВМЕСТО ГРАФИКА — ТО САМОЕ МОЛЧАНИЕ, С КОТОРЫМ МЫ БОРЕМСЯ.
   * Пока показаний нет (лицо не найдено, разбор ещё поднимается или не поднялся вовсе),
   * человеку говорят словами, а не оставляют смотреть в пустоту.
   */
  const [cmfState, setCmfState] = useState<'starting' | 'reading' | 'noFace' | 'unavailable'>(
    'starting',
  );
  const video = useRef<HTMLVideoElement>(null);

  const at = useCallback((e: { clientX: number; clientY: number }) => {
    const box = surface.current?.getBoundingClientRect();
    return [e.clientX - (box?.left ?? 0), e.clientY - (box?.top ?? 0)];
  }, []);

  /** Камера — только по нажатию и только после того, как сказано, что происходит. */
  async function askCamera() {
    setCameraFailed(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCamera(stream);
    } catch {
      // Отказ в доступе — не поломка: человек имеет право сказать «нет», и ему об этом говорят.
      setCameraFailed(true);
    }
  }

  useEffect(() => {
    if (!camera || !video.current) return undefined;
    video.current.srcObject = camera;
    void video.current.play().catch(() => undefined);
    setCmfState('starting');
    const handle = startAttentionPipeline(video.current, undefined, {
      onReady: () => setCmfState((prev) => (prev === 'starting' ? 'noFace' : prev)),
      onUnavailable: () => setCmfState('unavailable'),
      // 🔒 Единственный получатель — этот график. Ни `reportAttention`, ни сокета: в демо
      // агрегат некому слать, и это не забывчивость, а условие показа.
      onBucket: (_bucketStart, bucket) => {
        setCmfState('reading');
        setPoints((prev) => [...prev, bucket.avgAttention].slice(-40));
      },
    });
    return () => {
      handle.stop();
      camera.getTracks().forEach((track) => track.stop());
    };
  }, [camera]);

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <Link to="/" className={styles.brand} aria-label="Flamingo">
          <Logo />
        </Link>
        <span className={styles.badge}>{t('demo:badge')}</span>
        <span className={styles.enter}>
          <Link to="/register" className={styles.primaryBtn}>
            {t('demo:register')}
          </Link>
        </span>
      </header>

      <main className={styles.grid}>
        <section className={styles.boardPane} aria-labelledby="demo-board">
          <p className={styles.paneHead}>
            <span id="demo-board" className={styles.paneName}>
              {t('demo:board.title')}
            </span>
            <span className={styles.paneHint}>{t('demo:board.hint')}</span>
          </p>
          <svg
            ref={surface}
            className={styles.surface}
            role="application"
            aria-label={t('demo:board.title')}
            onPointerDown={(e) => {
              (e.target as Element).setPointerCapture?.(e.pointerId);
              drawing.current = at(e);
            }}
            onPointerMove={(e) => {
              if (!drawing.current) return;
              drawing.current = [...drawing.current, ...at(e)];
              setStrokes((prev) => [
                ...prev.filter((s) => s.id !== 0),
                { id: 0, points: drawing.current ?? [] },
              ]);
            }}
            onPointerUp={() => {
              if (drawing.current && drawing.current.length > 3) {
                const done = { id: nextId.current++, points: drawing.current };
                setStrokes((prev) => [...prev.filter((s) => s.id !== 0), done]);
              } else {
                setStrokes((prev) => prev.filter((s) => s.id !== 0));
              }
              drawing.current = null;
            }}
          >
            {strokes.map((stroke) => (
              <polyline
                key={stroke.id}
                className={styles.stroke}
                points={stroke.points.reduce<string[]>((acc, value, i) => {
                  if (i % 2 === 0) acc.push(`${value}`);
                  else acc[acc.length - 1] += `,${value}`;
                  return acc;
                }, []).join(' ')}
              />
            ))}
          </svg>
          {strokes.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setStrokes([])}>
              {t('demo:board.clear')}
            </Button>
          )}
        </section>

        <aside className={styles.side}>
          <section className={styles.card} aria-labelledby="demo-cmf">
            <p className={styles.paneHead}>
              <span id="demo-cmf" className={styles.paneName}>
                {t('demo:cmf.title')}
              </span>
            </p>
            <p className={styles.explain}>{t('demo:cmf.what')}</p>
            <PrivacyIndicator />
            {!camera ? (
              <>
                <Button variant="secondary" size="sm" onClick={() => void askCamera()}>
                  {t('demo:cmf.turnOn')}
                </Button>
                {cameraFailed && <p className={styles.refused}>{t('demo:cmf.refused')}</p>}
              </>
            ) : (
              <>
                <video ref={video} className={styles.video} muted playsInline />
                {points.length > 0 && <AttentionChart values={points} />}
                <p className={styles.explain}>
                  {points.length > 0 ? t('demo:cmf.live') : t(`demo:cmf.${cmfState}`)}
                </p>
              </>
            )}
          </section>

          <section className={styles.card} aria-labelledby="demo-anatomy">
            <p className={styles.paneHead}>
              <span id="demo-anatomy" className={styles.paneName}>
                {t('demo:anatomy.title')}
              </span>
            </p>
            <ul className={styles.anatomy}>
              {['board', 'class', 'chat', 'summary'].map((key) => (
                <li key={key}>
                  <b>{t(`demo:anatomy.${key}.head`)}</b> {t(`demo:anatomy.${key}.body`)}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </main>
    </div>
  );
}
