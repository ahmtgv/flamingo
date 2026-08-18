import { describe, expect, it } from 'vitest';

/**
 * 🔴 В СЦЕНЕ «КЛАСС» ПРОПАДАЛ ЗВУК (наряд 38, найдено RnD 19.08).
 *
 * Замер: `audio []` после перехода на «Класс», и снова `audio [{играет: true}]` при возврате
 * на «Доску». То есть на единственном экране, куда переходят СМОТРЕТЬ НА ЛЮДЕЙ, собеседника
 * переставало быть слышно: преподаватель открывает «Класс», чтобы видеть учеников, и глохнет.
 *
 * Причина: звук привязывался в `VideoTile`, а плитки живут в полосе видео, и полоса не
 * рисуется при `scene === 'class'`.
 *
 * Здесь сторожится ПРАВИЛО, а не разметка: **звук комнаты не зависит от того, какая сцена
 * открыта**. Полный сценарий (двое, четыре сцены подряд) — прибором, ему нужен эфир.
 */
async function source(file: string): Promise<string> {
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const text = readFileSync(join(process.cwd(), file), 'utf8');
  // ⚠️ Сначала убираем JSX-комментарии ЦЕЛИКОМ, вместе с фигурными скобками: обычная чистка
  // оставляет от `{/* … */}` пустое `{}`, и разметка перестаёт совпадать сама с собой.
  // На этом сторож покраснел на честном коде — четвёртый такой случай в репозитории.
  return text
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('прибор', () => {
  it('читает те файлы, о которых говорит', async () => {
    expect((await source('src/features/lesson/ui/RoomAudio.tsx')).length).toBeGreaterThan(300);
    expect((await source('src/features/lesson/ui/VideoTile.tsx')).length).toBeGreaterThan(300);
  });
});

describe('звук комнаты не зависит от сцены', () => {
  it('плитка видео звуком больше не владеет', async () => {
    const tile = await source('src/features/lesson/ui/VideoTile.tsx');
    // ⚠️ Проверяем ПРИВЯЗКУ, а не упоминание микрофона: плитка по-прежнему СПРАШИВАЕТ, не
    // выключен ли микрофон, чтобы нарисовать значок, — и это правильно. Первая версия сторожа
    // запрещала само слово и краснела на честном коде.
    expect(tile.includes('<audio'), 'в плитке снова элемент звука').toBe(false);
    expect(/Microphone\)\?\.track[\s\S]{0,80}\.attach\(/.test(tile), 'плитка снова привязывает звук').toBe(
      false,
    );
  });

  it('звук рисуется в раме, вне сцен и вкладок', async () => {
    const frame = await source('src/features/lesson/ui/RoomFrame.tsx');
    // Именно ВЫШЕ сцены: внутри `.scene` он снова зависел бы от переключения.
    // Между открывающим тегом и звуком стоит объяснение — комментарии вырезаны выше,
    // поэтому допускаем пустое место любой длины, но НЕ другой разметки.
    expect(frame).toMatch(/className=\{styles\.shell\}>\s*\{roomAudio\}/);
  });

  it('обе комнаты — и преподавателя, и ученика — отдают звук раме', async () => {
    const screen = await source('src/features/lesson/ui/LiveRoomScreen.tsx');
    expect(screen.match(/roomAudio=\{<RoomAudio/g)?.length ?? 0).toBe(2);
  });

  it('🔴 ученику в звук идёт ТОЛЬКО преподаватель — это про его канал, а не про экран', async () => {
    // Решение владельца Р5.1: урок раздаётся с машины преподавателя, и подписывать ученика на
    // дорожки всех одноклассников значит платить его каналом. Меня на этом поймал уже
    // существующий сторож `videoStrip.p51.test.tsx` — здесь то же правило названо для звука.
    const screen = await source('src/features/lesson/ui/LiveRoomScreen.tsx');
    const studentBlock = screen.slice(
      screen.indexOf('function StudentRoom'),
      screen.indexOf('function TeacherRoom'),
    );
    expect(studentBlock).toContain('<RoomAudio participants={teacherOnly}');
    expect(studentBlock.includes('<RoomAudio participants={lk.participants}')).toBe(false);
  });

  it('в звук комнаты попадают только удалённые участники — иначе эхо', async () => {
    const audio = await source('src/features/lesson/ui/RoomAudio.tsx');
    expect(audio).toMatch(/participants: readonly RemoteParticipant\[\]/);
  });
});
