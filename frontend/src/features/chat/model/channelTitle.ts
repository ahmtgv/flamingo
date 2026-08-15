import type { TFunction } from 'i18next';

import type { MyChannelsQuery } from '@/entities/graphql/generated';

type Channel = MyChannelsQuery['myChannels'][number];

/**
 * The conversation's name, composed on the client.
 *
 * The server sends no `title` — it sends the kind, the course, the group and the people,
 * and the wording happens here. Same rule as every other screen: data from the API, Russian
 * from i18n, so the product stays translatable.
 */
export function channelTitle(channel: Channel, t: TFunction<readonly ['chat']>): string {
  const other = channel.participants[0];
  // §24: в узком списке — «Имя Ф.». Одного имени мало (двух Вер не различить), полное имя
  // с фамилией не помещается. Собирает сервер — правило живёт в одном месте.
  const name = other ? other.shortName : t('chat:someone');
  switch (channel.kind) {
    case 'SUBJECT_GROUP':
      return channel.groupName
        ? t('chat:kind.SUBJECT_GROUP', {
            course: channel.courseTitle ?? '',
            group: channel.groupName,
          })
        : t('chat:kind.SUBJECT_GROUP_NOGROUP', { course: channel.courseTitle ?? '' });
    case 'STAFF_ROOM':
      return t('chat:kind.STAFF_ROOM', { institution: channel.institutionName ?? '' });
    default:
      return name;
  }
}
