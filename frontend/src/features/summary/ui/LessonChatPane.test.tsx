import { type MockedResponse } from '@apollo/client/testing';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { LessonChatDocument, SendChatMessageDocument } from '@/entities/graphql/generated';
import { renderWithProviders } from '@/test/renderWithProviders';

import { LessonChatPane } from './LessonChatPane';

const SESSION = 'ses-1';

const chatMock = (messages: unknown[]): MockedResponse => ({
  request: { query: LessonChatDocument, variables: { sessionId: SESSION } },
  result: { data: { lessonChat: messages } },
});

const message = (over: Record<string, unknown> = {}) => ({
  __typename: 'ChatMessage',
  id: 'm-1',
  sessionId: SESSION,
  senderId: 'u-1',
  senderName: 'Петя Ковалёв',
  text: 'а go straight on тоже правильно?',
  sentAt: new Date('2026-08-13T12:09:00Z').toISOString(),
  ...over,
});

const render = (mocks: MockedResponse[]) =>
  renderWithProviders(<LessonChatPane sessionId={SESSION} />, { mocks });

describe('LessonChatPane', () => {
  it('shows who wrote what', async () => {
    render([chatMock([message()])]);
    expect(await screen.findByText(/а go straight on тоже правильно\?/)).toBeInTheDocument();
    expect(screen.getByText(/Петя Ковалёв/)).toBeInTheDocument();
  });

  it('says out loud that this is not a feed — everything important goes to the summary', async () => {
    render([chatMock([])]);
    expect(
      await screen.findByText(
        /чат урока живёт только во время занятия · всё важное уходит в саммари/,
      ),
    ).toBeInTheDocument();
  });

  it('an empty room says so rather than showing an empty box', async () => {
    render([chatMock([])]);
    expect(await screen.findByText('Пока никто не писал')).toBeInTheDocument();
  });

  it('sends what was typed and clears the field', async () => {
    let sent: string | null = null;
    render([
      chatMock([]),
      {
        request: {
          query: SendChatMessageDocument,
          variables: { sessionId: SESSION, text: 'можно ссылку на аудио?' },
        },
        result: () => {
          sent = 'можно ссылку на аудио?';
          return { data: { sendChatMessage: message({ text: 'можно ссылку на аудио?' }) } };
        },
      },
      chatMock([message({ text: 'можно ссылку на аудио?' })]),
    ]);

    const field = await screen.findByRole('textbox', { name: 'Написать в чат урока' });
    await userEvent.type(field, 'можно ссылку на аудио?');
    await userEvent.click(screen.getByRole('button', { name: 'Отправить' }));

    expect(sent).toBe('можно ссылку на аудио?');
    expect(field).toHaveValue('');
  });

  it('an empty message is not sent', async () => {
    render([chatMock([])]);
    const field = await screen.findByRole('textbox', { name: 'Написать в чат урока' });
    await userEvent.type(field, '   ');
    await userEvent.click(screen.getByRole('button', { name: 'Отправить' }));
    // No SendChatMessage mock is registered — if it fired, MockedProvider would error out
    // and the failure notice would appear.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('a failed load reports as a status, not as an alert over the lesson', async () => {
    render([
      {
        request: { query: LessonChatDocument, variables: { sessionId: SESSION } },
        error: new Error('network down'),
      },
    ]);
    expect(await screen.findByRole('status')).toHaveTextContent(/Не получилось загрузить чат/);
  });
});
