import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 🔴 ПРАВИЛО ФАЗЫ: ни одно действие не завершается молча (промпт 19 §Б3).
 *
 * 15 августа четыре дефекта подряд оказались одним и тем же: кнопка нажимается, мутация
 * падает, экран не говорит ничего. Каждый стоил около часа поиска, и каждый был отчитан как
 * работающий, потому что проверяли НАЛИЧИЕ элемента, а не его РАБОТУ.
 *
 * Дисциплина этого не удержала — здесь механизм. Тест смотрит на исходники экранов и требует:
 * у мутации, которую вызывает экран, обязан быть перехват. Он не заменяет проверку поведения
 * (та в тестах экранов), но ловит самый частый случай: `await mutate()` без `catch` вообще.
 *
 * ⚠️ Тест намеренно грубый и намеренно с исключениями — точный анализ потока здесь не нужен,
 * нужна сетка, сквозь которую не проходит забытый `try`.
 */

// Корень исходников. Vitest подставляет в `import.meta.url` не файловый URL, поэтому берём
// путь от рабочего каталога прогона (`frontend/`), а не от модуля.
const SRC = join(process.cwd(), 'src');

/**
 * Экраны, где вызов мутации без перехвата допустим, и почему.
 */
const ALLOWED: Record<string, string> = {
  // Опрос подтверждения: «ещё не подтвердили» приходит ошибкой и ошибкой не является —
  // отсчёт на экране уже говорит, что происходит.
  'features/desktop/setup/PairingStep.tsx': 'опрос claim: отказ = «ещё не подтвердили»',
};

/**
 * 🔴 ХРАПОВИК, а не ноль.
 *
 * Аудит 16.08 нашёл **56** вызовов мутаций без перехвата на 34 экранах — по точному счёту
 * (только имена, связанные с `use*Mutation`) их было **33**. Починены прежде всего те, что
 * лежат на пути живого урока: начать и завершить занятие, войти в комнату, назначить занятие,
 * выдать и проверить домашнюю работу, снять копию кабинета, записаться на курс, конструктор
 * курса целиком.
 *
 * Остальные — редактирование учреждения, инлайновые формы конструктора, сохранённые материалы,
 * правка саммари — остаются долгом. Ставить здесь ноль значило бы соврать; ставить «сколько
 * получится» — ничего не проверять. Поэтому число: оно может только уменьшаться.
 *
 * ⚠️ Тест падает и когда долг ВЫРОС, и когда он уменьшился, а число не обновили. Второе —
 * напоминание порадоваться и записать новое.
 */
const KNOWN_SILENT = 20;

interface Offence {
  file: string;
  line: number;
  snippet: string;
}

/** Все .tsx под features — без сторонних зависимостей, обходом каталога. */
function screenFiles(dir: string, prefix = ''): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    const rel = prefix ? `${prefix}/${name}` : name;
    if (statSync(full).isDirectory()) return screenFiles(full, rel);
    return name.endsWith('.tsx') && !name.includes('.test.') ? [rel] : [];
  });
}

function screensCallingMutations(): string[] {
  return screenFiles(join(SRC, 'features'))
    .map((f) => `features/${f}`)
    .filter((f) => /use\w*Mutation\(/.test(readFileSync(join(SRC, f), 'utf8')));
}

/**
 * Имена, связанные с мутациями в этом файле: `const [configure] = useConfigureMutation()`.
 * Считать по ним, а не по любому `await`, — иначе в улов попадают `refetch()` и `onDone()`,
 * и число перестаёт что-либо значить.
 */
function mutationNames(text: string): Set<string> {
  const names = new Set<string>();
  const re = /const\s*\[\s*(\w+)[^\]]*\]\s*=\s*use\w*Mutation\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) names.add(m[1]);
  return names;
}

/** Вызовы мутаций, вокруг которых нет ни `catch`, ни `.catch(`. */
function unguarded(file: string): Offence[] {
  const text = readFileSync(join(SRC, file), 'utf8');
  const names = mutationNames(text);
  if (!names.size) return [];
  const lines = text.split('\n');
  const out: Offence[] = [];

  lines.forEach((line, i) => {
    const call = /await\s+(\w+)\s*\(/.exec(line);
    if (!call || !names.has(call[1])) return;
    // Перехват ищем по окружению вызова, а не разбором потока: цель — сетка от забытого
    // `try`, а не точный анализ.
    const around = lines.slice(Math.max(0, i - 25), Math.min(lines.length, i + 25)).join('\n');
    if (/catch\s*[({]/.test(around) || /\.catch\(/.test(around)) return;
    out.push({ file, line: i + 1, snippet: line.trim().slice(0, 80) });
  });
  return out;
}

describe('🔴 ни одно действие не завершается молча', () => {
  it('молчащих вызовов не становится больше', () => {
    const offences = screensCallingMutations()
      .filter((file) => !(file in ALLOWED))
      .flatMap(unguarded);

    expect(
      offences.length,
      offences.length > KNOWN_SILENT
        ? `новая молчащая кнопка: при отказе сервера человек не узнает причину\n${offences
            .map((o) => `  ${o.file}:${o.line}  ${o.snippet}`)
            .join('\n')}`
        : `долг уменьшился до ${offences.length} — обновите KNOWN_SILENT`,
    ).toBe(KNOWN_SILENT);
  });

  it('🔴 путь живого урока молчать не имеет права', () => {
    // Отдельно и без храповика: эти экраны ведут занятие. Здесь допустимый долг — ноль.
    const lessonPath = [
      'features/schedule/ui/ScheduleScreen.tsx',
      'features/desktop/setup/CabinetStep.tsx',
      'features/desktop/setup/ConsentStep.tsx',
      'features/desktop/setup/CheckStep.tsx',
      'features/desktop/setup/DoneStep.tsx',
    ];
    const offences = lessonPath.flatMap(unguarded);
    expect(offences.map((o) => `${o.file}:${o.line}`)).toEqual([]);
  });

  it('список исключений остаётся коротким и объяснённым', () => {
    // Растущий список исключений — это то же молчание, только записанное. Порог намеренно
    // низкий: понадобится третье — значит, пора чинить не тест, а экраны.
    expect(Object.keys(ALLOWED).length).toBeLessThanOrEqual(2);
    for (const why of Object.values(ALLOWED)) expect(why.length).toBeGreaterThan(10);
  });
});
