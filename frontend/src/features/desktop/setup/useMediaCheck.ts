import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Настоящая проверка камеры и микрофона — та, где человек видит себя и слышит себя.
 *
 * 🔴 НАХОДКА ВЛАДЕЛЬЦА 16.08: на маке со встроенной камерой — «Камера не найдена»,
 * «Микрофон: —». Две причины, и обе снаружи React:
 *
 * 1. В `tauri.conf.json` ключ `bundle.macOS` был ПУСТ: ни `NSCameraUsageDescription`, ни
 *    `NSMicrophoneUsageDescription`. Без этих строк macOS не отдаёт устройства и даже не
 *    показывает запрос разрешения — приложению просто нечего показать.
 * 2. Экран звал `enumerateDevices()` и ничего больше. До выдачи разрешения браузерный движок
 *    отдаёт список без названий (а WebKit — часто и вовсе пустой). Отсюда и «—» вместо
 *    микрофона: не «нет устройства», а «нам ещё не разрешили посмотреть».
 *
 * ⚠️ «Устройства нет» и «доступ запрещён» — РАЗНЫЕ беды с разными выходами, и различать их
 * обязательно: если разрешение однажды отклонили, система больше НЕ СПРОСИТ, и человек будет
 * жать «проверить» до утра. Во втором случае ведём в системные настройки.
 *
 * 🔒 Поток остаётся на устройстве целиком (CLAUDE.md §2.1): превью рисуется локально, уровень
 * звука считается локально, наружу не уходит ни кадра, ни семпла.
 */

export type MediaState =
  | 'idle' // ещё не спрашивали
  | 'asking' // системное окно разрешения открыто
  | 'live' // видим и слышим
  | 'denied' // отказали — система больше не спросит
  | 'missing' // устройств нет вовсе
  | 'failed'; // что-то другое

export interface Device {
  id: string;
  label: string;
}

export interface MediaCheck {
  state: MediaState;
  /** Уровень микрофона 0…1, обновляется покадрово. */
  level: number;
  cameras: Device[];
  mics: Device[];
  speakers: Device[];
  cameraId: string | null;
  micId: string | null;
  speakerId: string | null;
  stream: MediaStream | null;
  start: () => Promise<void>;
  pick: (kind: 'camera' | 'mic' | 'speaker', id: string) => void;
  stop: () => void;
}

/** Что именно сказал браузер, когда не дал устройства. */
function readFailure(error: unknown): MediaState {
  const name = (error as { name?: string } | null)?.name ?? '';
  // NotAllowed — человек (или система) отказали. Позвать окно ещё раз нельзя: macOS покажет
  // его один раз за всю жизнь приложения.
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied';
  // NotFound — камеры/микрофона физически нет. Это не отказ, урок вести можно.
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'missing';
  return 'failed';
}

const byKind = (list: MediaDeviceInfo[], kind: MediaDeviceKind, fallback: string): Device[] =>
  list
    .filter((d) => d.kind === kind)
    .map((d, i) => ({ id: d.deviceId, label: d.label || `${fallback} ${i + 1}` }));

export function useMediaCheck(): MediaCheck {
  const [state, setState] = useState<MediaState>('idle');
  const [level, setLevel] = useState(0);
  const [cameras, setCameras] = useState<Device[]>([]);
  const [mics, setMics] = useState<Device[]>([]);
  const [speakers, setSpeakers] = useState<Device[]>([]);
  const [cameraId, setCameraId] = useState<string | null>(null);
  const [micId, setMicId] = useState<string | null>(null);
  const [speakerId, setSpeakerId] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const audioRef = useRef<{ ctx: AudioContext; raf: number } | null>(null);

  const teardown = useCallback(() => {
    audioRef.current?.ctx.close().catch(() => {});
    if (audioRef.current) cancelAnimationFrame(audioRef.current.raf);
    audioRef.current = null;
    setLevel(0);
  }, []);

  /** Считать громкость из потока — на устройстве, без единого запроса наружу. */
  const meter = useCallback(
    (source: MediaStream) => {
      teardown();
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(source).connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const loop = () => {
        analyser.getByteTimeDomainData(buf);
        // Среднеквадратичное отклонение от тишины — то, что человек видит как «шевелится».
        let sum = 0;
        for (const v of buf) sum += (v - 128) ** 2;
        setLevel(Math.min(1, Math.sqrt(sum / buf.length) / 40));
        const raf = requestAnimationFrame(loop);
        if (audioRef.current) audioRef.current.raf = raf;
      };
      audioRef.current = { ctx, raf: requestAnimationFrame(loop) };

      // 🔴 WebKit создаёт AudioContext в состоянии «приостановлен», пока не случится жест
      // пользователя. Анализатор при этом читает тишину, и полоса уровня не шевелится —
      // ровно то, что видел владелец 16.08: «полоса не реагирует ни на голос, ни на шум».
      // Оживало после переключения камеры, потому что переключение — это и есть жест.
      //
      // Просим возобновить сразу; отказ не роняет проверку — камера от него не зависит.
      if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
    },
    [teardown],
  );

  const open = useCallback(
    async (wantCamera?: string, wantMic?: string) => {
      const constraints: MediaStreamConstraints = {
        video: wantCamera ? { deviceId: { exact: wantCamera } } : true,
        audio: wantMic ? { deviceId: { exact: wantMic } } : true,
      };
      const media = await navigator.mediaDevices.getUserMedia(constraints);
      setStream((old) => {
        old?.getTracks().forEach((t) => t.stop());
        return media;
      });
      meter(media);
      // Названия устройств появляются ТОЛЬКО после выдачи разрешения — перечисляем после.
      const all = await navigator.mediaDevices.enumerateDevices();
      setCameras(byKind(all, 'videoinput', 'Камера'));
      setMics(byKind(all, 'audioinput', 'Микрофон'));
      setSpeakers(byKind(all, 'audiooutput', 'Динамик'));
      setCameraId(media.getVideoTracks()[0]?.getSettings().deviceId ?? null);
      setMicId(media.getAudioTracks()[0]?.getSettings().deviceId ?? null);
      setState('live');
    },
    [meter],
  );

  const start = useCallback(async () => {
    setState('asking');
    try {
      await open();
    } catch (error) {
      // Камеры может не быть, а микрофон быть. Пробуем звук отдельно, прежде чем сказать
      // «устройств нет»: преподаватель без камеры урок ведёт, без звука — нет.
      try {
        const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true });
        setStream(audioOnly);
        meter(audioOnly);
        const all = await navigator.mediaDevices.enumerateDevices();
        setCameras([]);
        setMics(byKind(all, 'audioinput', 'Микрофон'));
        setSpeakers(byKind(all, 'audiooutput', 'Динамик'));
        setState('live');
      } catch {
        setState(readFailure(error));
      }
    }
  }, [open, meter]);

  const pick = useCallback(
    (kind: 'camera' | 'mic' | 'speaker', id: string) => {
      if (kind === 'speaker') {
        setSpeakerId(id);
        return;
      }
      const nextCamera = kind === 'camera' ? id : (cameraId ?? undefined);
      const nextMic = kind === 'mic' ? id : (micId ?? undefined);
      if (kind === 'camera') setCameraId(id);
      else setMicId(id);
      void open(nextCamera, nextMic).catch(() => setState('failed'));
    },
    [open, cameraId, micId],
  );

  const stop = useCallback(() => {
    teardown();
    setStream((old) => {
      old?.getTracks().forEach((t) => t.stop());
      return null;
    });
    setState('idle');
  }, [teardown]);

  // Камеру гасим, уходя с экрана: индикатор, горящий после ухода, — это уже не проверка.
  useEffect(() => stop, [stop]);

  return {
    state,
    level,
    cameras,
    mics,
    speakers,
    cameraId,
    micId,
    speakerId,
    stream,
    start,
    pick,
    stop,
  };
}
