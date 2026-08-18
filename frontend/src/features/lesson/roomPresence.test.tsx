import { describe, expect, it } from 'vitest';

/**
 * 🔴 ДВА ДЕФЕКТА, НАЙДЕННЫЕ ЗАМЕРОМ ВИДЕО 18.08 (наряд 35 §1).
 *
 * Двое живых людей впервые увидели и услышали друг друга — и вместе с этим вылезло, что у
 * преподавателя ученик подписан `8cbb7f0d · нет данных`, шестнадцатеричным огрызком вместо
 * «Аня К.». Две независимые причины, обе про «дверь, на которой не спросили»:
 *
 * 1. **Комната — последняя дверь, и отметки на ней не было.** Промпт 27 научил отмечаться
 *    расписание и точку встречи; но в комнату попадают и прямой ссылкой — прислали адрес,
 *    перезагрузил вкладку, вернулся после обрыва. Тогда `joinSession` не звал никто, и
 *    человек был на уроке, не будучи отмеченным. В дневник уехало бы «отсутствовал».
 *
 * 2. **Список присутствующих спрашивался один раз — до того, как кто-либо пришёл.**
 *    Преподаватель заходит первым, список пуст; ученик приходит — список не перечитывается.
 *
 * Здесь сторожатся оба стыка на уровне исходника: полный сценарий требует двух браузеров и
 * живого LiveKit (`scripts/two-people-video.mjs`), а в обычный прогон его не поставить —
 * ни камеры, ни облака в харнессе нет. Поэтому проверяется то, что проверить честно можно:
 * что вызовы стоят и что триггер именно тот, а не таймер.
 */

async function source(): Promise<string> {
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  return readFileSync(join(process.cwd(), 'src/features/lesson/ui/LiveRoomScreen.tsx'), 'utf8');
}

describe('прибор', () => {
  it('читает тот файл, о котором говорит', async () => {
    const text = await source();
    expect(text).toContain('LiveRoomRealScreen');
    expect(text.length).toBeGreaterThan(1000);
  });
});

describe('присутствие в комнате', () => {
  it('вход в комнату отмечает ученика — каким бы путём он ни вошёл', async () => {
    const text = await source();
    expect(text).toContain('useJoinSessionMutation');
    expect(text).toMatch(/MarkPresent/);
    // Отметка только для ученика: преподаватель — не строка присутствия (сервер это тоже знает).
    expect(text).toMatch(/<TeacherRoom[\s\S]{0,200}<MarkPresent/);
  });

  it('имена перечитываются по СОСТАВУ комнаты, а не по таймеру', async () => {
    const text = await source();
    // Таймер означал бы, что до N секунд урока преподаватель смотрит на цифры вместо детей.
    expect(text).toMatch(/const roomSize = lk\.participants\.length/);
    expect(text).toMatch(/refetchAttendees[\s\S]{0,200}\[roomSize/);
    expect(text).not.toMatch(/setInterval\([\s\S]{0,80}refetchAttendees/);
  });
});
