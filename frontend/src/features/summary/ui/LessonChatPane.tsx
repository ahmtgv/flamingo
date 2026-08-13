import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  type LessonChatQuery,
  useLessonChatQuery,
  useSendChatMessageMutation,
} from '@/entities/graphql/generated';
import { Button } from '@/shared/ui';

import styles from './summary.module.css';

type Message = LessonChatQuery['lessonChat'][number];

/**
 * The lesson chat — the «чат» pane of atlas sheet 02's right panel.
 *
 * It has no feed of its own. Every message here is written straight into the CHAT section of
 * the lesson's summary, so the note at the bottom of the sheet — «чат урока живёт только во
 * время занятия · всё важное уходит в саммари» — describes where the data actually goes, not
 * a promise the product intends to keep later.
 */
export function LessonChatPane({ sessionId }: { sessionId: string }) {
  const { t } = useTranslation('summary');
  const { data, loading, error, refetch } = useLessonChatQuery({
    variables: { sessionId },
    pollInterval: 5_000,
  });
  // A message is a summary item, so a summary open in another window is now stale. Naming the
  // query refetches it only when it is actually on screen — nothing happens when it is not.
  const [send, { loading: sending }] = useSendChatMessageMutation({
    refetchQueries: ['LessonSummary'],
  });
  const [text, setText] = useState('');
  const [failed, setFailed] = useState(false);

  const messages: Message[] = data?.lessonChat ?? [];

  async function submit() {
    const body = text.trim();
    if (!body) return;
    setFailed(false);
    try {
      await send({ variables: { sessionId, text: body } });
      setText('');
      await refetch();
    } catch {
      setFailed(true);
    }
  }

  return (
    <div className={styles.chat}>
      <div className={styles.msgs}>
        {loading && !data && <p className={styles.hint}>…</p>}
        {error && !data && (
          <p className={styles.hint} role="status">
            {t('chat.error')}
          </p>
        )}
        {!loading && messages.length === 0 && <p className={styles.hint}>{t('chat.empty')}</p>}
        {messages.map((message) => (
          <div className={styles.msg} key={message.id}>
            <span className={styles.who}>
              {message.senderName} · {time(message.sentAt)}
            </span>
            <span className={styles.body}>{message.text}</span>
          </div>
        ))}
      </div>

      <form
        className={styles.compose}
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <input
          className={styles.composeInput}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('chat.placeholder')}
          aria-label={t('chat.placeholder')}
        />
        <Button size="sm" type="submit" loading={sending}>
          {t('chat.send')}
        </Button>
      </form>

      {failed && (
        <p className={styles.failed} role="alert">
          {t('chat.failed')}
        </p>
      )}
      {/* Sheet 02 says it in as many words, and it is worth saying: this is not a feed. */}
      <p className={styles.chatNote}>{t('chat.note')}</p>
    </div>
  );
}

function time(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso),
  );
}
