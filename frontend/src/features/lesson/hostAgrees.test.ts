import { describe, expect, it } from 'vitest';

import { hostState } from '@/features/desktop/hostState';

/**
 * 🔴 ПРИЛОЖЕНИЕ СПОРИЛО САМО С СОБОЙ (живой урок 18.08, наряд 37 §1.2).
 *
 * Верхняя строка окна говорила «урок не идёт», а прямо под ней — значок «идёт» и живая
 * комната с доской и чатом. Одно из двух утверждений было ложным, и преподаватель смотрит
 * именно на верхнюю строку, чтобы понять, идёт ли занятие.
 *
 * Место названо: рама узнавала об уроке только когда преподаватель ВОШЁЛ В ЭФИР, а комната
 * считает урок идущим, как только занятие живое. Разные факты назывались одним словом.
 */
async function source(): Promise<string> {
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const text = readFileSync(join(process.cwd(), 'src/features/lesson/ui/LiveRoomScreen.tsx'), 'utf8');
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('рама говорит то же, что комната', () => {
  it('🔴 об уроке сообщают по «занятие живое», а не по «я включил камеру»', async () => {
    const text = await source();
    expect(text).toMatch(/usePublishHostLesson\(\s*isLive && startAt/);
    // Ровно то, что стояло раньше и давало спор двух строк на одном экране.
    expect(text).not.toMatch(/usePublishHostLesson\(\s*joined && isLive/);
  });

  it('«я в эфире» осталось отдельным фактом, а не слилось с «урок идёт»', async () => {
    expect(await source()).toMatch(/joined: inRoom/);
  });

  it('состояние рамы при живом уроке — не «простой»', () => {
    // Та же функция, которой рама подписывает окно: с живым уроком «idle» невозможен.
    expect(hostState({ online: true, lessonLive: true, verdict: 'COMFORTABLE' })).not.toBe('idle');
    expect(hostState({ online: true, lessonLive: false, verdict: 'COMFORTABLE' })).toBe('idle');
  });
});
