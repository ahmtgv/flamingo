import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import { type Pane, RoomFrame, type Scene } from './RoomFrame';

function Harness({ onScene }: { onScene?: (s: Scene) => void } = {}) {
  const [scene, setScene] = useState<Scene>('board');
  const [pane, setPane] = useState<Pane>('people');
  return (
    <RoomFrame
      title="English A2 · Unit 4"
      meta="урок 4 · Ирина Соколова"
      isLive
      scene={scene}
      onScene={(s) => {
        setScene(s);
        onScene?.(s);
      }}
      pane={pane}
      onPane={setPane}
      sessionId="s1"
      strip={<div>видео-полоса</div>}
      panel={<p>панель: {pane}</p>}
    >
      <p>сцена: {scene}</p>
    </RoomFrame>
  );
}

const render = () => renderWithProviders(<Harness />, { route: '/sessions/s1/room' });

describe('RoomFrame — atlas sheet 02', () => {
  it('names the lesson, marks it running, and shows the video strip', () => {
    render();
    expect(screen.getByText('English A2 · Unit 4')).toBeInTheDocument();
    expect(screen.getByText('урок 4 · Ирина Соколова')).toBeInTheDocument();
    expect(screen.getByText('идёт')).toBeInTheDocument();
    expect(screen.getByText('видео-полоса')).toBeInTheDocument();
  });

  it('offers the four windows of the sheet and switches the scene', async () => {
    render();
    const bar = screen.getByRole('tablist', { name: 'Окна урока' });
    expect(
      within(bar)
        .getAllByRole('tab')
        .map((b) => b.textContent),
    ).toEqual(['Доска', 'Методичка', 'Тест', 'Саммари']);

    expect(screen.getByText('сцена: board')).toBeInTheDocument();
    await userEvent.click(within(bar).getByRole('tab', { name: 'Методичка' }));
    expect(screen.getByText('сцена: material')).toBeInTheDocument();
  });

  it('any window can leave for its own tab — that is the multi-screen half', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    render();

    await userEvent.click(
      screen.getByRole('button', { name: 'Открыть «Тест» отдельной вкладкой' }),
    );
    expect(open).toHaveBeenCalledWith('/sessions/s1/window/test', '_blank', 'noopener');
    open.mockRestore();
  });

  it('the panel is personal: changing it leaves the shared scene where it was', async () => {
    render();
    await userEvent.click(screen.getByRole('tab', { name: 'Словарь' }));

    expect(screen.getByText('панель: dict')).toBeInTheDocument();
    // The scene is what everyone sees — a personal tool must not move it.
    expect(screen.getByText('сцена: board')).toBeInTheDocument();
  });

  it('scene and panel are wired as real tabpanels for assistive tech', () => {
    render();
    const scenePanel = screen.getByRole('tabpanel', { name: 'Доска' });
    expect(scenePanel).toHaveTextContent('сцена: board');
    const panePanel = screen.getByRole('tabpanel', { name: 'Участники' });
    expect(panePanel).toHaveTextContent('панель: people');
  });

  it('a lesson that is not running does not claim to be', () => {
    renderWithProviders(
      <RoomFrame
        title="English A2"
        meta="урок 4"
        isLive={false}
        scene="board"
        onScene={() => {}}
        pane="people"
        onPane={() => {}}
        sessionId="s1"
        panel={<p>панель</p>}
      >
        <p>сцена</p>
      </RoomFrame>,
      { route: '/sessions/s1/room' },
    );
    expect(screen.queryByText('идёт')).not.toBeInTheDocument();
  });
});
