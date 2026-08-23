import { screen, waitFor } from '@testing-library/react';
import { createPortal } from 'react-dom';
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

  it('в заголовке одна кнопка — настройки; не место для функций', () => {
    // §60.3: было две, вторая — «свернуть», дублировавшая системный жёлтый кружок.
    frame({ onSettings: () => {} });
    const bar = screen.getByRole('banner');
    const buttons = screen.getAllByRole('button').filter((b) => bar.contains(b));
    expect(buttons).toHaveLength(1);
  });

  it('🔴 шестерёнки нет, пока некому её обработать', () => {
    // Находка владельца 15.08 №4: кнопка была нарисована, обработчика не было, нажатие не
    // делало ничего. Кнопка, которая ничего не делает, хуже отсутствующей.
    frame();
    const bar = screen.getByRole('banner');
    // Без обработчика кнопок в заголовке не остаётся вовсе (§60.3 убрал «свернуть»),
    // поэтому спрашиваем `queryAll`: `getAll` бросает на пустом списке, и проверка
    // падала бы по причине, к делу не относящейся.
    const buttons = screen.queryAllByRole('button').filter((b) => bar.contains(b));
    expect(buttons).toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'Настройки' })).not.toBeInTheDocument();
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
    /**
     * ⚠️ ЭТОТ ТЕСТ БЫЛ ЗЕЛЁН И ПРОВЕРЯЛ САМ СЕБЯ (аудит 17.08).
     *
     * Он объявлял свою `Room`, звал `useFrameControls()` и убеждался, что напечатанное
     * появилось в полосе. Всё честно — кроме одного: `useFrameControls` не вызывал НИ ОДИН
     * экран продукта. Комната рисовала свою строку над сценой, ту самую, которую лист D1
     * отменил, а тест подтверждал работу канала, по которому никто не ходил.
     *
     * Теперь канал — портал (рама даёт МЕСТО, комната рисует в него), и подставная комната
     * ниже устроена ровно так же, как настоящая: `createPortal` в узел из контекста.
     */
    function Room() {
      const slot = useFrameControls();
      return slot ? createPortal(<button type="button">Доска</button>, slot) : <p>комната</p>;
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
  /*
   * 🔴 §60.3: КНОПКА «СВЕРНУТЬ» УБРАНА — она дублировала жёлтый системный кружок macOS,
   * стоящий в 78 px левее, и была нарисована голым знаком «▾».
   *
   * Смысл подписи в трее при этом остался: свернувший окно преподаватель забывает про
   * открытую комнату. Поэтому подпись теперь ставится САМА, при смене состояния, и
   * системное сворачивание показывает её так же. Проверяем это, а не кнопку.
   */
  it('подпись в трее ставится сама, без всякой кнопки', async () => {
    insideTheApp();
    frame();

    await waitFor(() => {
      const label = invoke.mock.calls.find(([cmd]) => cmd === 'set_tray_label')?.[1] as
        | { label: string }
        | undefined;
      expect(label?.label).toContain('24:16');
      expect(label?.label).toContain('6 из 8');
    });
  });

  it('ставя подпись, рама не трогает урок', async () => {
    insideTheApp();
    frame();

    await waitFor(() => expect(invoke).toHaveBeenCalled());
    const commands = invoke.mock.calls.map(([cmd]) => cmd).join(' ');
    expect(commands).not.toMatch(/end|finish|close|stop|quit/i);
  });

  it('в браузере рама ничего не зовёт', () => {
    frame(); // no __TAURI_INTERNALS__
    expect(invoke).not.toHaveBeenCalled();
  });
});
