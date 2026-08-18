import { describe, expect, it } from 'vitest';

/**
 * 🔴 ДВЕ ПОЛОМКИ ЖИВОГО УРОКА 18.08, У КОТОРЫХ ОКАЗАЛСЯ ОДИН КОРЕНЬ (наряд 37 §1.1 и §1.3).
 *
 * Владелец: «в приложении и в браузере моя камера во вкладке Класс не работает». То, что в
 * ОБОИХ, было главной уликой: дело не в приложении и не в правах macOS.
 *
 * Место названо: `ClassWindow` рисовал **только инициалы**. Дорожке было неоткуда взяться —
 * `Participant` её не нёс вовсе; комментарий рядом обещал «инициалы до прихода видео», а
 * видео не приходило никогда. Вкладка «Участники» была статической заглушкой «Пока никого»,
 * которую никто ничем не наполнял.
 *
 * ⚠️ ГИПОТЕЗА РЕВЬЮЕРА («отметка о приходе ставится не везде», как с присутствием) НЕ
 * ПОДТВЕРДИЛАСЬ. Дело было проще и хуже: списка не существовало.
 *
 * Здесь сторожатся три свойства, каждое из которых терялось по отдельности и каждое стоило
 * половины замера. Полный сценарий — `scripts/two-people-video.mjs`, ему нужны двое и эфир.
 */
async function source(file: string): Promise<string> {
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const text = readFileSync(join(process.cwd(), file), 'utf8');
  // Комментарии вырезаем: сканеры в этом репозитории трижды принимали запрет за нарушение.
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('прибор', () => {
  it('читает те файлы, о которых говорит', async () => {
    expect((await source('src/features/lesson/ui/ClassWindow.tsx')).length).toBeGreaterThan(500);
    expect((await source('src/features/lesson/classLayout.ts')).length).toBeGreaterThan(500);
  });
});

describe('окно «Класс» показывает людей, а не инициалы', () => {
  it('плитка участника несёт дорожку или свой поток', async () => {
    const layout = await source('src/features/lesson/classLayout.ts');
    expect(layout).toMatch(/track\?: RemoteTrack/);
    expect(layout).toMatch(/selfStream\?: MediaStream/);
  });

  it('🔴 картинка есть в ОБЕИХ плитках: и в общей, и в отдельной преподавательской', async () => {
    // Преподаватель рисуется своим блоком вне ветвлений раскладки («виден всегда»), и первая
    // правка дала видео всем, кроме него: добавили в общую плитку, а сюда забыли.
    const text = await source('src/features/lesson/ui/ClassWindow.tsx');
    expect(text.match(/<ClassVideo/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(text).toMatch(/data-teacher="true"[\s\S]{0,200}<ClassVideo/);
  });

  it('🔴 дорожка перепривязывается по `version` — чужая приезжает ПОЗЖЕ первого рендера', async () => {
    // Привязка одним callback-ref давала ровно половину: своя картинка есть, чужой нет.
    const text = await source('src/features/lesson/ui/ClassWindow.tsx');
    expect(text).toMatch(/useEffect\([\s\S]{0,600}participant\.track[\s\S]{0,120}version\]/);
  });
});

describe('вкладка «Участники» называет тех, кто в комнате', () => {
  it('список строится из живой комнаты, а не из статического текста', async () => {
    const text = await source('src/features/lesson/ui/LiveRoomScreen.tsx');
    expect(text).toMatch(/const people = \[/);
    // «Пока никого» осталось — но только как ветка для пустой комнаты, не как весь экран.
    expect(text).toMatch(/people\.length === 0[\s\S]{0,120}people\.empty/);
  });

  it('преподаватель не задваивается у ученика', async () => {
    // Первый замер показал «Ирина П без камеры» и «Ирина П камера в эфире» одной строкой ниже.
    const text = await source('src/features/lesson/ui/LiveRoomScreen.tsx');
    expect(text).toMatch(/filter\(\(p\) => p\.identity !== teacherId\)/);
  });
});
