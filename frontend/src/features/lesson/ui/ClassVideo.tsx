import { useEffect, useRef } from 'react';

import { type Participant } from '../classLayout';

import styles from './classvideo.module.css';

/**
 * Картинка одной плитки: чужая дорожка из эфира или свой локальный поток.
 *
 * ⚠️ Привязка через callback-ref, а не через эффект: элемент появляется и исчезает вместе со
 * сменой раскладки, и эффект на `[]` привязался бы к тому, чего ещё нет — той же ошибкой, из-за
 * которой щипок на доске не работал ни разу (наряд 34 §5).
 */
export function ClassVideo({ participant, version }: { participant: Participant; version?: number }) {
  const node = useRef<HTMLVideoElement>(null);

  /**
   * 🔴 ПРИВЯЗКА В ЭФФЕКТЕ ПО `version`, А НЕ ОДНИМ CALLBACK-REF.
   *
   * Первая правка §1.3 привязывала дорожку callback-ref'ом — и замер показал ровно половину:
   * своя картинка появилась, ЧУЖАЯ нет. Дорожка удалённого участника приезжает ПОЗЖЕ первого
   * рендера, и к моменту, когда она есть, ссылка уже привязана и второй раз её не зовут.
   *
   * `version` — счётчик, который `useLiveKitRoom` увеличивает на каждое изменение комнаты.
   * Тем же приёмом живёт `VideoTile`, у которого чужое видео работает с самого начала; здесь
   * он был не применён — и это ровно то место, где терялась картинка в окне «Класс».
   */
  useEffect(() => {
    const element = node.current;
    if (!element) return undefined;
    if (participant.selfStream) {
      element.srcObject = participant.selfStream;
      void element.play().catch(() => undefined);
      return undefined;
    }
    const track = participant.track;
    if (!track) return undefined;
    track.attach(element);
    return () => {
      track.detach(element);
    };
  }, [participant.selfStream, participant.track, version]);

  if (!participant.track && !participant.selfStream) return null;
  return (
    <video
      ref={node}
      className={styles.video}
      autoPlay
      playsInline
      // Свою плитку глушим всегда: иначе преподаватель слышит собственное эхо.
      muted={Boolean(participant.selfStream)}
    />
  );
}
