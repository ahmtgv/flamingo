import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import i18n from '@/i18n';

import { RoomFrame } from './RoomFrame';

/**
 * 🔴 ВЫХОД ИЗ КОМНАТЫ — ПОВЕДЕНИЕ, КОТОРОЕ НЕ ПРОВЕРЯЛ НИКТО (наряд 47 §2).
 *
 * Владелец 23.08 нажал обе кнопки выхода по три раза и остался в комнате: обе висели на
 * необязательном `onLeave`, которого ученику и предпросмотру не передавали вовсе, а
 * преподавателю — только после входа в эфир, куда до начала занятия не пускают. Нажатие
 * ловилось и не делало ничего: ни ошибки, ни следа. `RoomFrame.test.tsx` слов
 * `exit`/`leave` не содержал ни одного.
 */
function frame(props: Record<string, unknown> = {}) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={['/sessions/s-1/room']}>
        <Routes>
          <Route
            path="/sessions/:sessionId/room"
            element={
              <RoomFrame
                title="Чёрная материя"
                meta="астрономия"
                isLive={false}
                scene="board"
                onScene={() => {}}
                pane={null}
                onPane={() => {}}
                sessionId="s-1"
                controls={null}
                panel={null}
                {...props}
              >
                <div>состояние</div>
              </RoomFrame>
            }
          />
          <Route path="/start" element={<div>кабинет</div>} />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>,
  );
}

describe('выход из комнаты', () => {
  it('уводит из комнаты, даже когда обработчика ухода нет вовсе', async () => {
    frame();

    await userEvent.click(screen.getByRole('button', { name: /выйти из урока/i }));

    expect(await screen.findByText('кабинет')).toBeInTheDocument();
  });

  it('нижняя кнопка выхода уводит так же', async () => {
    frame();

    await userEvent.click(screen.getByRole('button', { name: /^выйти$/i }));

    expect(await screen.findByText('кабинет')).toBeInTheDocument();
  });

  it('сначала отпускает эфир, потом уводит', async () => {
    const onLeave = vi.fn();
    frame({ onLeave });

    await userEvent.click(screen.getByRole('button', { name: /выйти из урока/i }));

    expect(onLeave).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('кабинет')).toBeInTheDocument();
  });

  it('развалившийся эфир не запирает человека в комнате', async () => {
    const onLeave = vi.fn(() => {
      throw new Error('LiveKit развалился');
    });
    frame({ onLeave });

    await userEvent.click(screen.getByRole('button', { name: /^выйти$/i }));

    expect(await screen.findByText('кабинет')).toBeInTheDocument();
  });

  it('одного нажатия достаточно и при идущем уроке', async () => {
    frame({ isLive: true, onLeave: vi.fn() });

    await userEvent.click(screen.getByRole('button', { name: /выйти из урока/i }));

    expect(await screen.findByText('кабинет')).toBeInTheDocument();
  });
});
