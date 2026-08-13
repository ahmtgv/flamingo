import { useChatUnreadQuery } from '@/entities/graphql/generated';

/**
 * How many messages are waiting — the number on the header button and on the bubble.
 *
 * A small dedicated query rather than a derived count: the header shows it on every screen,
 * including ones that never load the channel list.
 */
export function useChatUnread(): number {
  const { data } = useChatUnreadQuery({ fetchPolicy: 'cache-and-network', pollInterval: 30_000 });
  return data?.chatUnread ?? 0;
}
