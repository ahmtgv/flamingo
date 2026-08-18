import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { MyMirrorDocument } from '@/entities/graphql/generated';
import { renderWithProviders } from '@/test/renderWithProviders';

import { MyLearningScreen } from './ui/MyLearningScreen';

/**
 * 🔴 ЭКРАН ПОД УЖЕ ДАННЫМ ОБЕЩАНИЕМ (наряд 36 §2).
 *
 * `OWNER_SCOPE §20.5`: учёба принадлежит ученику навсегда, открывается с любого устройства и
 * переживает уход преподавателя. Зеркало наполнялось с промпта 29, покрыто тестами — и
 * `myMirror` числился среди сирот: **ни один экран его не читал**. Обещание жило в тестах.
 *
 * ⚠️ ГЛАВНОЕ, ЧТО СТОРОЖИТСЯ ЗДЕСЬ, — не вёрстка, а **независимость от чужой машины**:
 * экран не должен спрашивать ничего про устройство преподавателя, точку встречи или его
 * присутствие. Если однажды кто-то добавит сюда такой запрос, обещание тихо перестанет
 * выполняться ровно в тот день, когда ноутбук выключен.
 */

const record = (kind: string, payload: unknown, id: string) => ({
  __typename: 'MirroredRecord' as const,
  id,
  kind,
  sourceId: `src-${id}`,
  occurredAt: '2026-08-18T10:00:00Z',
  payload,
});

const mirror = (kind: string, records: unknown[]) => ({
  request: { query: MyMirrorDocument, variables: { kind, limit: 200 } },
  result: { data: { myMirror: records } },
});

function renderScreen(mocks: ReturnType<typeof mirror>[]) {
  return renderWithProviders(<MyLearningScreen />, { mocks, route: '/my-learning' });
}

describe('«Моя учёба»', () => {
  it('показывает занятие из дневника — с курсом и присутствием', async () => {
    renderScreen([
      mirror('DIARY', [
        record(
          'DIARY',
          { lessonTitle: 'Present Perfect', courseTitle: 'Английский A2', attendance: 'present' },
          'd1',
        ),
      ]),
    ]);
    expect(await screen.findByText('Present Perfect')).toBeTruthy();
    expect(screen.getByText(/Английский A2/)).toBeTruthy();
  });

  it('показывает работу: попытку, оценку и слова преподавателя', async () => {
    const user = userEvent.setup();
    renderScreen([
      mirror('DIARY', []),
      mirror('WORK', [
        record(
          'WORK',
          {
            homeworkTitle: 'Упражнения 1–5',
            attempt: 2,
            score: 5,
            text: 'I have finished.',
            comment: 'Отлично, посмотри третий пример.',
          },
          'w1',
        ),
      ]),
    ]);
    await user.click(await screen.findByRole('button', { name: 'Работы' }));
    expect(await screen.findByText('Упражнения 1–5')).toBeTruthy();
    expect(screen.getByText(/Попытка 2/)).toBeTruthy();
    expect(screen.getByText(/Отлично, посмотри третий пример/)).toBeTruthy();
  });

  it('пустое состояние говорит, ЧТО здесь будет, а не молчит', async () => {
    renderScreen([mirror('DIARY', [])]);
    expect(await screen.findByText(/Здесь появится каждое ваше занятие/)).toBeTruthy();
  });

  it('🔴 не спрашивает НИЧЕГО про машину преподавателя — в этом весь смысл экрана', async () => {
    const asked: string[] = [];
    const mocks = [mirror('DIARY', [])];
    renderScreen(mocks);
    await waitFor(() => expect(screen.getByText(/Здесь появится/)).toBeTruthy());

    // Проверяем ИСХОДНИК: единственный способ убедиться, что завтра сюда не добавят запрос
    // про устройство, — запретить это имя в файле. Мок бы такого не поймал.
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const source = readFileSync(
      join(process.cwd(), 'src/features/mylearning/ui/MyLearningScreen.tsx'),
      'utf8',
    );
    for (const forbidden of ['ThisDevice', 'MeetingPoint', 'HostPresence', 'Uplink', 'hostOnline']) {
      expect(source.includes(forbidden), `экран спрашивает ${forbidden}`).toBe(false);
    }
    expect(asked).toEqual([]);
  });
});
