import { type ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useThisDeviceQuery } from '@/entities/graphql/generated';

import { isDesktop, setTrayMenu } from './bridge';
import { elapsedSince, useHostLesson } from './hostBeacon';
import { useHeartbeat } from './useHeartbeat';
import { useScheduledBackup } from './useScheduledBackup';
import { DesktopFrame } from './DesktopFrame';
import { OfflineScreen } from './OfflineScreen';
import type { UplinkVerdict } from './hostState';

/**
 * Puts the frame around the app — but only inside the app (atlas sheet D1).
 *
 * In a browser tab this renders its children and nothing else. That is not a courtesy to the
 * browser: the title bar exists *because* the app has no address bar, and drawing a fake one
 * over a real one would be furniture. Sheet D1 describes exactly the three things that differ
 * from a tab, and outside the app none of the three is true.
 */
export function DesktopShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation('desktop');
  const navigate = useNavigate();
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  // Р5.5-В п.3: копию будит приложение — при старте, если пора. Таймера нет и не заводим.
  useScheduledBackup();
  // 🔴 Пульс машины (находка Н-1): без него преподаватель числится офлайн всегда, а живой
  // урок закрывается сам через десять минут после планового конца.
  useHeartbeat();

  // Факты урока — от комнаты (см. hostBeacon), качество канала — от сервера.
  const lesson = useHostLesson();
  const { data: deviceData } = useThisDeviceQuery({ skip: !isDesktop() });
  const verdict: UplinkVerdict = deviceData?.thisDevice?.uplink?.verdict ?? 'UNKNOWN';

  // Часы тикают ТОЛЬКО пока идёт урок: «Идёт 24:16» обязано идти, а вне урока таймер в раме
  // — это перерисовка всего дерева раз в секунду без единого зрителя.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!lesson) return undefined;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [lesson]);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  // The tray's two words come from `ru.json` like every other piece of product text.
  useEffect(() => {
    if (isDesktop()) void setTrayMenu(t('tray.open'), t('tray.quit'));
  }, [t]);

  if (!isDesktop()) return <>{children}</>;

  return (
    <DesktopFrame
      online={online}
      /* 🔴 Здесь стояли две константы — `lessonLive={false}` и `verdict = 'UNKNOWN'` — и от них
         весь лист D1 был выключен: см. `hostBeacon.ts`. Теперь оба факта настоящие: урок
         объявляет комната, качество канала измерил сам сервер (`thisDevice.uplink`). */
      lessonLive={lesson !== null}
      verdict={verdict}
      lessonName={lesson?.lessonName}
      lessonNumber={lesson?.lessonNumber}
      participantCount={lesson?.participantCount}
      joined={lesson?.joined}
      elapsed={lesson ? elapsedSince(lesson.startedAt, now) : undefined}
      actions={lesson?.actions}
      // Шестерёнка ведёт в настройки приложения — экран, который уже существует (Р5.4).
      // Без этой строки кнопка рисовалась и не делала ничего (находка 15.08 №4).
      onSettings={() => navigate('/settings')}
    >
      {/* 🔴 ДЕТИ НЕ РАЗМОНТИРУЮТСЯ ПРИ ОБРЫВЕ СЕТИ (найдено аудитом 17.08).
          Здесь стояло `online ? children : <OfflineScreen/>`, и это выбрасывало из дерева
          ВСЁ, включая комнату урока. По коду дальше: cleanup гасил камеру, LiveKit рвал
          соединение, конвейер CMF останавливался. Сеть вернулась — всё монтируется с нуля,
          «Войти» надо жать заново, разрешение на камеру спрашивается снова.
          `navigator.onLine` на школьном Wi-Fi дёргается при каждом переключении точки
          доступа: двухсекундная моргалка убивала урок целиком.
          ⚠️ В `LiveRoomScreen` стоит специальный комментарий о том, что размонтировать
          вошедшую комнату нельзя ИМЕННО поэтому — защита была сделана внутри и обойдена
          слоем выше.
          Теперь офлайн — это НАКЛАДКА поверх живого дерева: урок продолжает идти, а человек
          видит, что связи нет. */}
      {children}
      {!online && <OfflineScreen onRetry={() => setOnline(navigator.onLine)} />}
    </DesktopFrame>
  );
}
