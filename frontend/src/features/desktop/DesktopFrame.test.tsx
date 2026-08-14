import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import { DesktopFrame, type DesktopFrameProps } from './DesktopFrame';
import { useFrameControls } from './frameControls';

const invoke = vi.fn().mockResolvedValue(undefined);

/** Pretend to be the Tauri shell — the bridge only looks for this one object. */
function insideTheApp() {
  (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = { invoke };
}

const frame = (over: Partial<DesktopFrameProps> = {}) =>
  renderWithProviders(
    <DesktopFrame
      online
      lessonLive
      verdict="COMFORTABLE"
      lessonName="English A2 · Unit 4 — Travel"
      lessonNumber={4}
      participantCount={8}
      joined={6}
      elapsed="24:16"
      {...over}
    >
      <p>содержимое окна</p>
    </DesktopFrame>,
  );

beforeEach(() => {
  invoke.mockClear();
  delete (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
});

describe('рама приложения — заголовок (лист D1)', () => {
  it('опознание урока живёт в заголовке окна', () => {
    frame();
    expect(screen.getByText('English A2 · Unit 4 — Travel')).toBeInTheDocument();
    expect(screen.getByText('урок 4 · 8 участников')).toBeInTheDocument();
  });

  it('вне урока строка не носит пустое название', () => {
    frame({ lessonLive: false });
    expect(screen.queryByText('English A2 · Unit 4 — Travel')).not.toBeInTheDocument();
    expect(screen.getByText('урок не идёт')).toBeInTheDocument();
  });

  it('версия на виду — первый вопрос при поддержке', () => {
    frame();
    expect(screen.getByText(/^\d+\.\d+\.\d+$/)).toBeInTheDocument();
  });

  it('в заголовке только свернуть и настройки — не место для функций', () => {
    frame();
    const bar = screen.getByRole('banner');
    const buttons = screen.getAllByRole('button').filter((b) => bar.contains(b));
    expect(buttons).toHaveLength(2);
  });
});

describe('рама приложения — полоса состояния', () => {
  it('когда урока нет — её нет вовсе', () => {
    frame({ lessonLive: false });
    expect(screen.queryByText('Связь')).not.toBeInTheDocument();
    expect(screen.queryByText('Подключено')).not.toBeInTheDocument();
  });

  it('связь показана словом, а не мегабитами', () => {
    frame({ verdict: 'TIGHT' });
    expect(screen.getByText('слабая')).toBeInTheDocument();
    // Мегабиты, потери и битрейт живут в настройках (решение владельца 14.08).
    expect(screen.queryByText(/Мбит|mbps|kbps/i)).not.toBeInTheDocument();
  });

  it('двое не дошли — видно раньше, чем они напишут в чат', () => {
    frame();
    expect(screen.getByText('6 из 8')).toBeInTheDocument();
  });

  it('при просевшем канале говорит, что уже сделано, а не «плохое соединение»', () => {
    frame({ verdict: 'TOO_WEAK' });
    expect(screen.getByText(/Снизили качество видео/)).toBeInTheDocument();
    expect(screen.queryByText(/плохое соединение/i)).not.toBeInTheDocument();
  });

  it('без сети переключатели прячутся: переключать нечего', () => {
    // The room publishes its switchers through the frame's context, so the test walks the same
    // path the lesson does rather than a prop that only exists for tests.
    function Room() {
      const publish = useFrameControls();
      useEffect(() => {
        publish(<button type="button">Доска</button>);
      }, [publish]);
      return <p>комната</p>;
    }

    const { rerender } = renderWithProviders(
      <DesktopFrame online lessonLive verdict="COMFORTABLE" lessonName="A2" joined={6}>
        <Room />
      </DesktopFrame>,
    );
    expect(screen.getByRole('button', { name: 'Доска' })).toBeInTheDocument();

    rerender(
      <DesktopFrame online={false} lessonLive verdict="COMFORTABLE" lessonName="A2" joined={6}>
        <Room />
      </DesktopFrame>,
    );
    expect(screen.queryByRole('button', { name: 'Доска' })).not.toBeInTheDocument();
  });
});

describe('рама приложения — трей', () => {
  it('🔴 свернуть — не завершить: урок не трогают', async () => {
    insideTheApp();
    frame();
    await userEvent.click(screen.getByRole('button', { name: 'Свернуть в трей' }));

    const commands = invoke.mock.calls.map(([cmd]) => cmd);
    expect(commands).toContain('minimise_to_tray');
    // Nothing in this path may end a lesson, close a room or stop the sidecar.
    expect(commands.join(' ')).not.toMatch(/end|finish|close|stop|quit/i);
  });

  it('в трее то же, что в заголовке', async () => {
    insideTheApp();
    frame();
    await userEvent.click(screen.getByRole('button', { name: 'Свернуть в трей' }));

    const label = invoke.mock.calls.find(([cmd]) => cmd === 'set_tray_label')?.[1] as {
      label: string;
    };
    expect(label.label).toContain('24:16');
    expect(label.label).toContain('6 из 8');
  });

  it('в браузере кнопка ничего не ломает', async () => {
    frame(); // no __TAURI_INTERNALS__
    await userEvent.click(screen.getByRole('button', { name: 'Свернуть в трей' }));
    expect(invoke).not.toHaveBeenCalled();
  });
});
