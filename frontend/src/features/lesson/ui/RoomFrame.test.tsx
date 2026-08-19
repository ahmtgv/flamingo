import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import { type Pane, RoomFrame, type Scene } from './RoomFrame';

function Harness({ onScene }: { onScene?: (s: Scene) => void } = {}) {
  const [scene, setScene] = useState<Scene>('board');
  const [pane, setPane] = useState<Pane | null>(null);
  return (
    <RoomFrame
      title="English A2 · Unit 4"
      meta="урок 4 · 20 участников"
      isLive
      stateTag="идёт 24 из 45 минут"
      scene={scene}
      onScene={(s) => {
        setScene(s);
        onScene?.(s);
      }}
      pane={pane}
      onPane={setPane}
      sessionId="s1"
      classPane={(ratio) => <div>лица: {ratio}%</div>}
      panel={<p>панель: {pane}</p>}
    >
      <p>сцена: {scene}</p>
    </RoomFrame>
  );
}

const render = () => renderWithProviders(<Harness />, { route: '/sessions/s1/room' });

describe('RoomFrame — лист «Комната урока»', () => {
  it('называет урок, говорит словом о состоянии и держит класс на экране', () => {
    render();
    expect(screen.getByText('English A2 · Unit 4')).toBeInTheDocument();
    expect(screen.getByText('урок 4 · 20 участников')).toBeInTheDocument();
    expect(screen.getByText('идёт 24 из 45 минут')).toBeInTheDocument();
    expect(screen.getByText('лица: 22%')).toBeInTheDocument();
  });

  it('окон четыре, и «Класса» среди них нет — класс больше не окно', async () => {
    render();
    const bar = screen.getByRole('tablist', { name: 'Окна урока' });
    expect(
      within(bar)
        .getAllByRole('tab')
        .map((b) => b.textContent),
    ).toEqual(['Доска', 'Методичка', 'Тест', 'Конспект']);

    expect(screen.getByText('сцена: board')).toBeInTheDocument();
    await userEvent.click(within(bar).getByRole('tab', { name: 'Методичка' }));
    expect(screen.getByText('сцена: material')).toBeInTheDocument();
  });

  it('🔴 класс виден в ЛЮБОМ окне: за людьми больше не нужно переключаться', async () => {
    render();
    for (const win of ['Методичка', 'Тест', 'Конспект']) {
      await userEvent.click(screen.getByRole('tab', { name: win }));
      // Ровно та поломка, которую убирает лист: раньше «Класс» ЗАМЕНЯЛ материал собой.
      expect(screen.getByText('лица: 22%')).toBeInTheDocument();
    }
  });

  it('панель закрыта по умолчанию, открывается кнопкой и той же кнопкой закрывается', async () => {
    render();
    // Занятие важнее инструмента: панель не занимает четверть кадра, пока её не позвали.
    expect(screen.queryByText(/^панель:/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Словарь' }));
    expect(screen.getByText('панель: dict')).toBeInTheDocument();
    // Панель личная — общая сцена от неё не двигается.
    expect(screen.getByText('сцена: board')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Словарь' }));
    expect(screen.queryByText(/^панель:/)).not.toBeInTheDocument();
  });

  it('текущее окно уходит отдельной вкладкой — вторая половина многоэкранности', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    render();
    await userEvent.click(screen.getByRole('tab', { name: 'Тест' }));
    await userEvent.click(screen.getByRole('button', { name: 'отдельным окном ↗' }));
    expect(open).toHaveBeenCalledWith('/sessions/s1/window/test', '_blank', 'noopener');
    open.mockRestore();
  });

  it('сцена — настоящая tabpanel, панель названа словами', async () => {
    render();
    expect(screen.getByRole('tabpanel', { name: 'Доска' })).toHaveTextContent('сцена: board');
    await userEvent.click(screen.getByRole('button', { name: 'Участники' }));
    expect(screen.getByRole('region', { name: 'Участники' })).toHaveTextContent('панель: people');
  });

  it('границу доски и лиц можно двигать с клавиатуры, не только мышью', async () => {
    render();
    const divider = screen.getByRole('separator', { name: 'Соотношение доски и лиц' });
    expect(divider).toHaveAttribute('aria-valuenow', '22');

    divider.focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByText('лица: 26%')).toBeInTheDocument();
  });

  it('урок, который не идёт, не заявляет, что идёт', () => {
    renderWithProviders(
      <RoomFrame
        title="English A2"
        meta="урок 4"
        isLive={false}
        scene="board"
        onScene={() => {}}
        pane={null}
        onPane={() => {}}
        sessionId="s1"
        panel={<p>панель</p>}
      >
        <p>сцена</p>
      </RoomFrame>,
      { route: '/sessions/s1/room' },
    );
    expect(screen.queryByText(/идёт/)).not.toBeInTheDocument();
  });
});
