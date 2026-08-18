import { type RemoteParticipant, Track } from 'livekit-client';
import { useEffect, useRef } from 'react';

/**
 * ЗВУК КОМНАТЫ — ОТДЕЛЬНО ОТ ТОГО, ЧТО ПОКАЗАНО НА ЭКРАНЕ (наряд 38, найдено RnD 19.08).
 *
 * 🔴 ЧТО ЭТО ЧИНИТ. Звук приезжал вместе с плиткой `VideoTile`, а плитки живут в полосе видео,
 * и полоса **не рисуется в сцене «Класс»** (`scene !== 'class'`). Замер:
 *
 *     сцена по умолчанию:        audio [{поток: true, играет: true, дорожки: audio:live}]
 *     после перехода в «Класс»:  audio []
 *     вернулись на «Доску»:      audio [{поток: true, играет: true}]
 *
 * То есть на единственном экране, куда переходят СМОТРЕТЬ НА ЛЮДЕЙ, собеседника переставало
 * быть слышно. Преподаватель открывает «Класс», чтобы видеть учеников, и глохнет.
 *
 * ⚠️ ЗВУК НЕ ДОЛЖЕН ЗАВИСЕТЬ ОТ РАСКЛАДКИ — это и есть правило, которое здесь закреплено.
 * Слушать урок можно с любой сцены: с доски, из теста, из саммари. Поэтому элементы звука
 * висят один раз на всю комнату и переживают любое переключение вкладок.
 *
 * 🔒 Ничего не показывает и ничего не отправляет: только принимает уже подписанные дорожки.
 */
export function RoomAudio({
  participants,
  version,
}: {
  participants: readonly RemoteParticipant[];
  /** Счётчик изменений комнаты — по нему перепривязываются дорожки, приехавшие позже. */
  version: number;
}) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = host.current;
    if (!node) return undefined;
    const attached: { track: { detach: (el: HTMLMediaElement) => unknown }; el: HTMLAudioElement }[] = [];

    for (const participant of participants) {
      const mic = participant.getTrackPublication(Track.Source.Microphone)?.track;
      if (!mic) continue;
      const el = document.createElement('audio');
      el.autoplay = true;
      // ⚠️ Не `muted`: это и есть звук урока. Своя дорожка сюда не попадает — здесь только
      // удалённые участники, поэтому эха не будет.
      node.appendChild(el);
      mic.attach(el);
      attached.push({ track: mic, el });
    }

    return () => {
      for (const { track, el } of attached) {
        track.detach(el);
        el.remove();
      }
    };
  }, [participants, version]);

  return <div ref={host} hidden aria-hidden="true" />;
}
