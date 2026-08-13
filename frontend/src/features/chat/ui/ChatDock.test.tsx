import { type MockedResponse } from '@apollo/client/testing';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GraphQLError } from 'graphql';
import { describe, expect, it } from 'vitest';

import {
  ChannelMessagesDocument,
  ChatPolicyDocument,
  type ChatPolicyQuery,
  MarkChannelReadDocument,
  MyChannelsDocument,
  type MyChannelsQuery,
  ReportChannelDocument,
  SendChannelMessageDocument,
} from '@/entities/graphql/generated';
import { renderWithProviders } from '@/test/renderWithProviders';

import { ChatDock } from './ChatDock';

type Channel = MyChannelsQuery['myChannels'][number];

const channel = (over: Partial<Channel> & { id: string; kind: Channel['kind'] }): Channel => ({
  __typename: 'ChatChannel',
  courseId: null,
  courseTitle: null,
  groupName: null,
  institutionName: null,
  participants: [],
  unread: 0,
  lastMessageAt: null,
  lastMessageText: null,
  readOnly: false,
  openReports: 0,
  ...over,
});

const PEER = channel({
  id: 'ch-vera',
  kind: 'PEER',
  lastMessageText: 'скинешь конспект?',
  unread: 2,
  participants: [
    {
      __typename: 'ChatParticipant',
      id: 'u-vera',
      firstName: 'Вера',
      lastName: 'Смирнова',
      role: 'STUDENT',
    },
  ],
});

const SUBJECT = channel({
  id: 'ch-astro',
  kind: 'SUBJECT_GROUP',
  courseId: 'c-astro',
  courseTitle: 'Астрономия',
  groupName: '9А',
  lastMessageText: 'материалы добавила',
});

const channelsMock = (channels: Channel[]): MockedResponse => ({
  request: { query: MyChannelsDocument, variables: {} },
  result: { data: { myChannels: channels } },
});

const policyMock = (over: Partial<ChatPolicyQuery['chatPolicy']> = {}): MockedResponse => ({
  request: { query: ChatPolicyDocument, variables: {} },
  result: {
    data: {
      chatPolicy: {
        __typename: 'ChatPolicyView',
        peerChat: true,
        directMessages: true,
        teacherVisibleAlways: false,
        premoderation: false,
        ...over,
      },
    },
  },
});

const messagesMock = (channelId: string, texts: [string, boolean][]): MockedResponse => ({
  request: { query: ChannelMessagesDocument, variables: { channelId } },
  result: {
    data: {
      channelMessages: texts.map(([text, mine], i) => ({
        __typename: 'ChannelMessage',
        id: `${channelId}-m${i}`,
        channelId,
        senderId: mine ? 'me' : 'u-vera',
        senderName: mine ? 'Саша Иванов' : 'Вера Смирнова',
        text,
        sentAt: new Date().toISOString(),
        mine,
      })),
    },
  },
});

const readMock = (channelId: string): MockedResponse => ({
  request: { query: MarkChannelReadDocument, variables: { channelId } },
  result: { data: { markChannelRead: true } },
});

/** Opening a conversation refetches the channel list (the badge has to clear), so every
 *  scenario gets a couple of spare list responses rather than an unhandled rejection. */
const render = (mocks: MockedResponse[], props = {}) => {
  const list = mocks.find((m) => 'request' in m && m.request.query === MyChannelsDocument);
  const spares = list ? [list, list] : [];
  return renderWithProviders(<ChatDock {...props} />, { mocks: [...mocks, ...spares] });
};

describe('ChatDock — atlas sheet 00, the chat is a window', () => {
  it('is closed until asked for, and the bubble carries the unread count', async () => {
    render([channelsMock([PEER]), policyMock()]);

    const bubble = await screen.findByRole('button', { name: /Чат/ });
    expect(within(bubble).getByText('2')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Сообщения' })).not.toBeInTheDocument();

    await userEvent.click(bubble);
    expect(screen.getByRole('region', { name: 'Сообщения' })).toBeInTheDocument();
  });

  it('lists the conversations the server put there, worded on the client', async () => {
    render([channelsMock([SUBJECT, PEER]), policyMock()]);
    await userEvent.click(await screen.findByRole('button', { name: /Чат/ }));

    // The server sends no title — «Астрономия · 9А» is composed here.
    expect(screen.getByText('Астрономия · 9А')).toBeInTheDocument();
    expect(screen.getByText('Вера Смирнова')).toBeInTheDocument();
  });

  it('opening a conversation marks it read and shows its messages', async () => {
    render([
      channelsMock([PEER]),
      policyMock(),
      readMock('ch-vera'),
      channelsMock([{ ...PEER, unread: 0 }]),
      messagesMock('ch-vera', [
        ['скинешь конспект?', false],
        ['держи', true],
      ]),
    ]);
    await userEvent.click(await screen.findByRole('button', { name: /Чат/ }));
    await userEvent.click(screen.getByRole('button', { name: /Вера Смирнова/ }));

    expect(await screen.findByText('скинешь конспект?')).toBeInTheDocument();
    expect(screen.getByText('держи')).toBeInTheDocument();
  });

  it('sends a message and clears the box', async () => {
    let sent = '';
    render([
      channelsMock([PEER]),
      policyMock(),
      readMock('ch-vera'),
      messagesMock('ch-vera', [['скинешь конспект?', false]]),
      {
        request: {
          query: SendChannelMessageDocument,
          variables: { channelId: 'ch-vera', text: 'сейчас' },
        },
        result: () => {
          sent = 'сейчас';
          return {
            data: {
              sendChannelMessage: {
                __typename: 'ChannelMessage',
                id: 'm-new',
                channelId: 'ch-vera',
                senderId: 'me',
                senderName: 'Саша',
                text: 'сейчас',
                sentAt: new Date().toISOString(),
                mine: true,
              },
            },
          };
        },
      },
      messagesMock('ch-vera', [
        ['скинешь конспект?', false],
        ['сейчас', true],
      ]),
      channelsMock([PEER]),
    ]);

    await userEvent.click(await screen.findByRole('button', { name: /Чат/ }));
    await userEvent.click(screen.getByRole('button', { name: /Вера Смирнова/ }));
    const box = await screen.findByLabelText('Написать сообщение');
    await userEvent.type(box, 'сейчас');
    await userEvent.click(screen.getByRole('button', { name: 'Отправить' }));

    expect(sent).toBe('сейчас');
    expect(box).toHaveValue('');
  });

  it('a server refusal is shown, not swallowed', async () => {
    render([
      channelsMock([PEER]),
      policyMock(),
      readMock('ch-vera'),
      messagesMock('ch-vera', []),
      {
        request: {
          query: SendChannelMessageDocument,
          variables: { channelId: 'ch-vera', text: 'нельзя' },
        },
        result: { errors: [new GraphQLError('Peer chat is not available here')] },
      },
    ]);

    await userEvent.click(await screen.findByRole('button', { name: /Чат/ }));
    await userEvent.click(screen.getByRole('button', { name: /Вера Смирнова/ }));
    await userEvent.type(await screen.findByLabelText('Написать сообщение'), 'нельзя');
    await userEvent.click(screen.getByRole('button', { name: 'Отправить' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Сообщение не отправилось');
  });
});

describe('ChatDock — the base safety mode is visible, not hidden', () => {
  it('every conversation carries «пожаловаться», and says what it does', async () => {
    render([
      channelsMock([PEER]),
      policyMock(),
      readMock('ch-vera'),
      messagesMock('ch-vera', [['обидное', false]]),
    ]);
    await userEvent.click(await screen.findByRole('button', { name: /Чат/ }));
    await userEvent.click(screen.getByRole('button', { name: /Вера Смирнова/ }));

    await userEvent.click(await screen.findByRole('button', { name: 'Пожаловаться' }));
    // The child is told exactly what happens next — that is the whole escalation path.
    expect(
      screen.getByText(/Преподаватель вашей группы сможет открыть переписку/),
    ).toBeInTheDocument();
    expect(screen.getByText(/До жалобы её никто не читает/)).toBeInTheDocument();
  });

  it('filing a complaint reports the channel and confirms it', async () => {
    let reported = false;
    render([
      channelsMock([PEER]),
      policyMock(),
      readMock('ch-vera'),
      messagesMock('ch-vera', [['обидное', false]]),
      {
        request: {
          query: ReportChannelDocument,
          variables: { channelId: 'ch-vera', reason: 'грубит' },
        },
        result: () => {
          reported = true;
          return {
            data: {
              reportChannel: {
                __typename: 'ChatReport',
                id: 'r1',
                channelId: 'ch-vera',
                status: 'OPEN',
              },
            },
          };
        },
      },
      channelsMock([{ ...PEER, openReports: 1 }]),
    ]);

    await userEvent.click(await screen.findByRole('button', { name: /Чат/ }));
    await userEvent.click(screen.getByRole('button', { name: /Вера Смирнова/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Пожаловаться' }));
    await userEvent.type(screen.getByLabelText('Что не так (необязательно)'), 'грубит');
    await userEvent.click(screen.getByRole('button', { name: 'Отправить жалобу' }));

    expect(
      await screen.findByText('Жалоба отправлена — преподаватель посмотрит'),
    ).toBeInTheDocument();
    expect(reported).toBe(true);
  });

  it('a conversation opened on a complaint is read-only, and says so', async () => {
    const reported = { ...PEER, readOnly: true, openReports: 1 };
    render([
      channelsMock([reported]),
      policyMock(),
      readMock('ch-vera'),
      messagesMock('ch-vera', [['обидное', false]]),
    ]);
    await userEvent.click(await screen.findByRole('button', { name: /Чат/ }));
    await userEvent.click(screen.getByRole('button', { name: /Вера Смирнова/ }));

    expect(await screen.findByText(/читать можно, писать нельзя/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Написать сообщение')).not.toBeInTheDocument();
  });

  it('explains a switched-off feature instead of offering a button that fails', async () => {
    render([channelsMock([SUBJECT]), policyMock({ peerChat: false })]);
    await userEvent.click(await screen.findByRole('button', { name: /Чат/ }));

    expect(
      await screen.findByText('Личные диалоги между учениками здесь недоступны'),
    ).toBeInTheDocument();
  });

  it('names the stricter modes when an institution has switched them on', async () => {
    render([
      channelsMock([SUBJECT]),
      policyMock({ premoderation: true, teacherVisibleAlways: true }),
    ]);
    await userEvent.click(await screen.findByRole('button', { name: /Чат/ }));

    expect(await screen.findByText('Сообщения в этой школе проходят проверку')).toBeInTheDocument();
    expect(screen.getByText('Переписку в этой школе видит преподаватель')).toBeInTheDocument();
  });

  it('an empty chat explains who you may write to', async () => {
    render([channelsMock([]), policyMock()]);
    await userEvent.click(await screen.findByRole('button', { name: /Чат/ }));

    expect(await screen.findByText('Пока ни одного диалога')).toBeInTheDocument();
    expect(screen.getByText('Написать можно тем, с кем вы в одной группе')).toBeInTheDocument();
  });
});

describe('ChatDock — on a subject page', () => {
  it('opens that subject’s conversation first', async () => {
    render(
      [
        channelsMock([SUBJECT, PEER]),
        policyMock(),
        readMock('ch-astro'),
        channelsMock([SUBJECT, PEER]),
        messagesMock('ch-astro', [['материалы добавила', false]]),
      ],
      { courseId: 'c-astro' },
    );

    await userEvent.click(await screen.findByRole('button', { name: /Чат предмета/ }));
    expect(await screen.findByText('материалы добавила')).toBeInTheDocument();
  });
});
