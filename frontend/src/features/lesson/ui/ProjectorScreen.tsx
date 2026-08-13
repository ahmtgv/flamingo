import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  useProjectorFocusChangedSubscription,
  useRedeemProjectorCodeMutation,
} from '@/entities/graphql/generated';
import { LIVEKIT_URL } from '@/shared/lib/env';
import { Button } from '@/shared/ui';

import { useLiveKitRoom } from '../livekit/useLiveKitRoom';

import styles from './roomframe.module.css';
import { VideoTile } from './VideoTile';

/**
 * The second screen itself — a tablet on the classroom wall.
 *
 * It is not an account: the code buys a watch-only, hidden connection and nothing else, so
 * this screen has no controls, no roster and no way into the rest of the product. Everything
 * it can do is follow what the teacher points it at (F3.1).
 */
export function ProjectorScreen() {
  const { t } = useTranslation('room');
  const [code, setCode] = useState('');
  const [redeem, { data, loading, error }] = useRedeemProjectorCodeMutation();
  const joined = data?.redeemProjectorCode ?? null;

  if (!joined) {
    return (
      <div className={styles.projectorJoin}>
        <h1 className={styles.projectorTitle}>{t('projector.joinTitle')}</h1>
        <p className={styles.castBody}>{t('projector.joinBody')}</p>
        <form
          className={styles.projectorForm}
          onSubmit={(e) => {
            e.preventDefault();
            void redeem({ variables: { code } }).catch(() => undefined);
          }}
        >
          <input
            className={styles.projectorInput}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={t('projector.joinPlaceholder')}
            aria-label={t('projector.joinPlaceholder')}
            autoFocus
          />
          <Button type="submit" loading={loading}>
            {t('projector.join')}
          </Button>
        </form>
        {error && (
          <p className={styles.castBody} role="alert">
            {t('projector.joinFailed')}
          </p>
        )}
      </div>
    );
  }

  return (
    <ProjectorStage
      sessionId={joined.sessionId}
      title={joined.lessonTitle}
      token={joined.roomToken}
    />
  );
}

function ProjectorStage({
  sessionId,
  title,
  token,
}: {
  sessionId: string;
  title: string;
  token: string;
}) {
  const { t } = useTranslation('room');
  const [focus, setFocus] = useState<string | null>(null);
  // Watch-only: no local stream is ever passed in, so this screen cannot publish even if the
  // token were wrong. Belt and braces on top of canPublish=false.
  const lk = useLiveKitRoom({ url: LIVEKIT_URL, token, stream: null, active: true });

  useProjectorFocusChangedSubscription({
    variables: { sessionId },
    onData: ({ data }) => setFocus(data.data?.projectorFocusChanged?.studentId ?? null),
  });

  // Focus narrows WHICH tiles render; the tiles themselves keep stable keys, so following
  // the teacher's focus never remounts a <video> (§2.7).
  const matched = focus ? lk.participants.filter((p) => p.identity === focus) : [];
  const tiles = matched.length > 0 ? matched : lk.participants;

  return (
    <div className={styles.projectorStage}>
      <p className={styles.projectorCaption}>{t('projector.watching', { lesson: title })}</p>
      <div className={matched.length > 0 ? styles.projectorFocus : styles.projectorGrid}>
        {tiles.map((p) => (
          <VideoTile
            key={p.sid}
            participant={p}
            version={lk.version}
            displayName={p.identity.slice(0, 8)}
          />
        ))}
      </div>
    </div>
  );
}
