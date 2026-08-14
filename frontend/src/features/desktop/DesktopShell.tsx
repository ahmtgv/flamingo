import { type ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { isDesktop, setTrayMenu } from './bridge';
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
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

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

  /**
   * The lesson's own facts — which lesson, how many joined, how long — are published by the
   * room screen once it exists on the desktop path. Until then the frame reports the machine
   * truthfully rather than inventing a lesson: `lessonLive: false` means the title bar carries
   * no name, which is exactly what «вне урока строка не носит пустое название» asks for.
   */
  const verdict: UplinkVerdict = 'UNKNOWN';

  return (
    <DesktopFrame online={online} lessonLive={false} verdict={verdict}>
      {online ? children : <OfflineScreen onRetry={() => setOnline(navigator.onLine)} />}
    </DesktopFrame>
  );
}
