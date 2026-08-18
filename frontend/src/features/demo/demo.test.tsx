import { describe, expect, it } from 'vitest';

/**
 * 🔴 ДЕМО-КОМНАТА ЗАПЕЧАТАНА ПО УСТРОЙСТВУ, А НЕ ПО РАЗРЕШЕНИЯМ (наряд 36 §3).
 *
 * Требование наряда: гость не может добраться до `sessionId` настоящего урока ни угадыванием,
 * ни подменой; в демо нет живых учеников и чужих данных; гость ничего не пишет в боевые
 * данные; ушёл — за ним ничего не осталось.
 *
 * Самый надёжный способ это выполнить — не проверять права, а **не дать чем дотянуться**:
 * экран не принимает идентификаторов и не делает ни одного запроса. Сторож держит именно это
 * свойство: появится здесь первый же вызов к серверу — тест покраснеет в тот же день, а не
 * через три недели на живом уроке.
 *
 * Полный сценарий (завести настоящее занятие и попытаться до него дотянуться) живёт в
 * `scripts/demo-is-sealed.mjs`: ему нужны сервер и браузер, в обычный прогон он не помещается.
 */
async function source(): Promise<string> {
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const text = readFileSync(join(process.cwd(), 'src/features/demo/ui/DemoRoomScreen.tsx'), 'utf8');
  /**
   * ⚠️ КОММЕНТАРИИ ВЫРЕЗАЕМ, И ЭТО НЕ ПРИДИРКА. Первая версия сторожа покраснела на честном
   * коде: в объяснении рядом с камерой написано «ни `reportAttention`, ни сокета», и сканер
   * прочитал ЗАПРЕТ как НАРУШЕНИЕ. Ровно так же врали сканеры в промптах 33 и 34 — один читал
   * JSDoc как разметку, другой резал тег по первому `>`.
   */
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('прибор', () => {
  it('читает тот файл, о котором говорит', async () => {
    const text = await source();
    expect(text).toContain('DemoRoomScreen');
    expect(text.length).toBeGreaterThan(1000);
  });
});

describe('демо-комната запечатана', () => {
  it('не делает ни одного запроса к серверу — ни чтения, ни записи', async () => {
    const text = await source();
    for (const forbidden of ['useQuery', 'useMutation', 'useLazyQuery', 'useSubscription', 'fetch(']) {
      expect(text.includes(forbidden), `демо обращается к серверу: ${forbidden}`).toBe(false);
    }
  });

  it('не знает и не принимает идентификатора занятия', async () => {
    const text = await source();
    for (const forbidden of ['sessionId', 'lessonId', 'useParams', 'roomToken']) {
      expect(text.includes(forbidden), `демо принимает ${forbidden}`).toBe(false);
    }
  });

  it('камера — только по нажатию, и агрегат никуда не уходит', async () => {
    const text = await source();
    expect(text).toContain('getUserMedia');
    // Явное нажатие: `getUserMedia` вызывается из обработчика, а не из эффекта при открытии.
    expect(text).toMatch(/async function askCamera\(\)[\s\S]{0,400}getUserMedia/);
    // Ни одной отправки наружу: `reportAttention` в демо быть не может.
    expect(text.includes('reportAttention')).toBe(false);
  });
});
