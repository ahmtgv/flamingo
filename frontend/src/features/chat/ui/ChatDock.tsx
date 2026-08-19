import { MessageCircle, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  type ChannelMessagesQuery,
  type MyChannelsQuery,
  ChannelMessagesDocument,
  useChannelMessageReceivedSubscription,
  useChannelMessagesQuery,
  useChatPolicyQuery,
  useMarkChannelReadMutation,
  useMyChannelsQuery,
  useReportChannelMutation,
  useSendChannelMessageMutation,
} from '@/entities/graphql/generated';
import { Button, ErrorState } from '@/shared/ui';
import { ICON_MD, ICON_SM } from '@/shared/ui/iconSizes';

import { channelTitle } from '../model/channelTitle';

import styles from './chat.module.css';

type Channel = MyChannelsQuery['myChannels'][number];
type Message = ChannelMessagesQuery['channelMessages'][number];

/**
 * The chat, as a window over the page (atlas sheet 00).
 *
 * It is deliberately not a screen and not a tab: a conversation that takes over the page
 * steals attention from the lesson, and the sheet says so outright. The bubble sits bottom
 * right, the header button carries the same count, and opening either one opens this.
 *
 * Nothing here decides who may talk to whom. The list contains exactly the conversations
 * the server put in it, and every action is refused server-side if it should be — the UI
 * only makes the refusal legible instead of offering a button that will fail.
 */
export function ChatDock({
  courseId,
  open: openProp,
  onOpenChange,
  bubble = true,
}: {
  courseId?: string;
  /** Optional controlled state, so a header button can open the same window. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * 🔴 ПЛАВАЮЩИЙ ПУЗЫРЬ СТОЯЛ НА ТЕКСТЕ ПРАВОЙ КОЛОНКИ КАБИНЕТА (прибор дизайнера, детский
   * режим). Замер: единственный слой на экране — этот пузырь, 98 × 48, `position: fixed`,
   * z-index 1000, непрозрачный; текст карточки зеркала уходил под него на 81 × 48.
   *
   * Отступом снизу это не лечится: колонка ПРОКРУЧИВАЕТСЯ, и под пузырь уезжает любой её
   * кусок, а не только последний. Лечится составом: там, где чат уже вызывается кнопкой в
   * шапке, пузырь — второе такое же приглашение на том же экране. Лист кабинета его не
   * рисует вовсе.
   */
  bubble?: boolean;
}) {
  const { t } = useTranslation(['chat', 'common']);
  const [openSelf, setOpenSelf] = useState(false);
  const open = openProp ?? openSelf;
  const setOpen = (next: boolean) => {
    setOpenSelf(next);
    onOpenChange?.(next);
  };
  const [active, setActive] = useState<string | null>(null);

  const { data, loading, error, refetch } = useMyChannelsQuery({
    fetchPolicy: 'cache-and-network',
  });
  const { data: policyData } = useChatPolicyQuery();
  const [markRead] = useMarkChannelReadMutation();

  const channels = data?.myChannels ?? [];
  const unread = channels.reduce((sum, c) => sum + c.unread, 0);
  const policy = policyData?.chatPolicy;
  // On a subject page the conversation about THAT subject is the one you want first.
  const suggested = courseId ? channels.find((c) => c.courseId === courseId) : undefined;
  const channel = channels.find((c) => c.id === active) ?? null;

  async function openChannel(id: string) {
    setActive(id);
    // Opening must never fail loudly: marking read is housekeeping, and a rejected promise
    // here would surface as an unhandled rejection rather than as anything the user can act on.
    try {
      await markRead({ variables: { channelId: id } });
      await refetch();
    } catch {
      /* the conversation is already open; the badge will catch up on the next read */
    }
  }

  return (
    <>
      {bubble && (
      <button
        type="button"
        className={styles.fab}
        onClick={() => {
          setOpen(!open);
          if (!open && suggested) void openChannel(suggested.id);
        }}
        aria-expanded={open}
      >
        <MessageCircle size={ICON_MD} aria-hidden="true" />
        {courseId ? t('chat:openSubject') : t('chat:open')}
        {unread > 0 && <span className={styles.fabCount}>{unread}</span>}
      </button>
      )}

      {open && (
        <section className={styles.dock} aria-label={t('chat:title')}>
          <header className={styles.dockHead}>
            {channel ? (
              <button type="button" className={styles.back} onClick={() => setActive(null)}>
                {t('chat:back')}
              </button>
            ) : (
              <span className={styles.dockTitle}>{t('chat:title')}</span>
            )}
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => setOpen(false)}
              aria-label={t('chat:close')}
            >
              <X size={ICON_SM} />
            </button>
          </header>

          {loading && !data ? (
            <p className={styles.empty}>{t('common:actions.loading')}</p>
          ) : error && !data ? (
            <ErrorState text={t('chat:error')} onRetry={() => void refetch()} />
          ) : channel ? (
            <Conversation channel={channel} onChanged={() => refetch()} />
          ) : (
            <ChannelList channels={channels} onOpen={(id) => void openChannel(id)} />
          )}

          {/* Say why a control is missing rather than leaving a silent gap. */}
          {policy && !policy.peerChat && (
            <p className={styles.policyNote}>{t('chat:policy.peerOff')}</p>
          )}
          {policy?.premoderation && (
            <p className={styles.policyNote}>{t('chat:policy.premoderation')}</p>
          )}
          {policy?.teacherVisibleAlways && (
            <p className={styles.policyNote}>{t('chat:policy.visible')}</p>
          )}
        </section>
      )}
    </>
  );
}

function ChannelList({
  channels,
  onOpen,
}: {
  channels: readonly Channel[];
  onOpen: (id: string) => void;
}) {
  const { t } = useTranslation(['chat']);
  if (channels.length === 0) {
    return (
      <div className={styles.empty}>
        <p>{t('chat:empty')}</p>
        <p className={styles.emptyHint}>{t('chat:emptyHint')}</p>
      </div>
    );
  }
  return (
    <ul className={styles.list}>
      {channels.map((channel) => (
        <li key={channel.id}>
          <button type="button" className={styles.row} onClick={() => onOpen(channel.id)}>
            <span className={styles.rowMain}>
              <span className={styles.rowName}>{channelTitle(channel, t)}</span>
              <span className={styles.rowLast}>
                {channel.lastMessageText ?? t('chat:emptyMessages')}
              </span>
            </span>
            <span className={styles.rowMeta}>
              <span className={styles.rowKind}>{t(`chat:kindLabel.${channel.kind}`)}</span>
              {channel.unread > 0 && <span className={styles.badge}>{channel.unread}</span>}
              {channel.openReports > 0 && (
                <span className={styles.reportBadge}>
                  {t('chat:report.openCount', { count: channel.openReports })}
                </span>
              )}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Conversation({
  channel,
  onChanged,
}: {
  channel: Channel;
  onChanged: () => Promise<unknown>;
}) {
  const { t } = useTranslation(['chat']);
  const [text, setText] = useState('');
  const [failed, setFailed] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  const { data, loading, refetch } = useChannelMessagesQuery({
    variables: { channelId: channel.id },
    fetchPolicy: 'cache-and-network',
    // Опрос — подстраховка под сокетом: вкладка спала, сокет молча отвалился. Реже, чем
    // раньше, потому что живой случай теперь несёт подписка, а не этот таймер.
    pollInterval: 30_000,
  });

  /**
   * 🔴 ПОДПИСКА БЫЛА ОПИСАНА И НЕ ПОДКЛЮЧЕНА (наряд 34 §1, §5).
   *
   * Здесь стояло `pollInterval: 15_000` с комментарием «the socket carries the live case» —
   * а сокета не было: документ `ChannelMessageReceived` существовал, хук по нему
   * генерировался, и его не звал никто. То есть сообщение в чате урока доходило до
   * собеседника **за пятнадцать секунд**, и комментарий в коде утверждал обратное.
   *
   * Тот же механизм, что и с `hostHeartbeat`, и с восемью мёртвыми подписками: код, который
   * умеет ответить, проверен; доходит ли до него вопрос — нет.
   */
  useChannelMessageReceivedSubscription({
    variables: { channelId: channel.id },
    onData: ({ client, data: payload }) => {
      const incoming = payload.data?.channelMessageReceived;
      if (!incoming) return;
      client.cache.updateQuery(
        { query: ChannelMessagesDocument, variables: { channelId: channel.id } },
        (prev) => {
          const known = prev?.channelMessages ?? [];
          if (known.some((m: { id: string }) => m.id === incoming.id)) return prev;
          return { ...prev, channelMessages: [...known, incoming] };
        },
      );
    },
  });
  const [send, { loading: sending }] = useSendChannelMessageMutation();
  const [report] = useReportChannelMutation();
  const messages = data?.channelMessages ?? [];

  useEffect(() => {
    // Optional call: jsdom (and a detached node) has no scrollIntoView, and failing to
    // scroll must never take the conversation down with it.
    bottom.current?.scrollIntoView?.({ block: 'end' });
  }, [messages.length]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setFailed(false);
    try {
      await send({ variables: { channelId: channel.id, text: body } });
      setText('');
      await Promise.all([refetch(), onChanged()]);
    } catch {
      // A refusal here is real (not a member, peer chat closed, a stop-word) — show it.
      setFailed(true);
    }
  }

  return (
    <>
      <div className={styles.thread}>
        <p className={styles.threadName}>{channelTitle(channel, t)}</p>
        {channel.readOnly && <p className={styles.readOnly}>{t('chat:teacher.readOnly')}</p>}
        {loading && messages.length === 0 ? (
          <p className={styles.empty}>{t('chat:emptyMessages')}</p>
        ) : messages.length === 0 ? (
          <p className={styles.empty}>{t('chat:emptyMessages')}</p>
        ) : (
          messages.map((m: Message) => (
            <div key={m.id} className={`${styles.msg} ${m.mine ? styles.msgMine : ''}`}>
              {!m.mine && <span className={styles.msgWho}>{m.senderName}</span>}
              <span className={styles.msgText}>{m.text}</span>
            </div>
          ))
        )}
        <div ref={bottom} />
      </div>

      {failed && (
        <p className={styles.failed} role="alert">
          {t('chat:failed')}
        </p>
      )}

      {!channel.readOnly && (
        <form className={styles.composer} onSubmit={(e) => void submit(e)}>
          <input
            className={styles.input}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('chat:placeholder')}
            aria-label={t('chat:placeholder')}
          />
          <Button size="sm" type="submit" loading={sending}>
            {t('chat:send')}
          </Button>
        </form>
      )}

      {/* «Пожаловаться» sits on every conversation — that is the base safety mode, and it
          is the only thing that lets a teacher open a pupil-to-pupil conversation. */}
      <div className={styles.reportRow}>
        {reported ? (
          <span className={styles.reportSent}>{t('chat:report.sent')}</span>
        ) : reporting ? (
          <ReportForm
            onCancel={() => setReporting(false)}
            onSubmit={async (reason) => {
              try {
                await report({ variables: { channelId: channel.id, reason } });
                setReporting(false);
                setReported(true);
                await onChanged();
              } catch {
                // A complaint that silently vanished is the worst possible failure here.
                setFailed(true);
                setReporting(false);
              }
            }}
          />
        ) : (
          <button type="button" className={styles.reportBtn} onClick={() => setReporting(true)}>
            {t('chat:report.action')}
          </button>
        )}
      </div>
    </>
  );
}

function ReportForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (reason: string) => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useTranslation(['chat']);
  const [reason, setReason] = useState('');
  return (
    <form
      className={styles.reportForm}
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit(reason);
      }}
    >
      <p className={styles.reportTitle}>{t('chat:report.title')}</p>
      <p className={styles.reportBody}>{t('chat:report.body')}</p>
      <input
        className={styles.input}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={t('chat:report.placeholder')}
        aria-label={t('chat:report.placeholder')}
        autoFocus
      />
      <div className={styles.reportActs}>
        <Button size="sm" type="submit">
          {t('chat:report.submit')}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          {t('chat:report.cancel')}
        </Button>
      </div>
    </form>
  );
}
