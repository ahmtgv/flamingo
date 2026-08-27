import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';

/**
 * 🔴 СВОДКА, КОТОРУЮ НЕЛЬЗЯ НЕ ЗАМЕТИТЬ (наряд 54 §1.3).
 *
 * За неделю трижды находили караул, который стоял в красном неизвестно сколько: `live`,
 * `site`, `wizard`. Всё это время «670 тестов зелёные» значило только `vitest`, а `e2e`
 * никто не смотрел. Плюс девять сценариев под флагом пропускаются молча — а пропущенный
 * сценарий выглядит как отсутствующий.
 *
 * Отчёт печатает три числа и ИМЕНА: красных и пропущенных. Молчание больше не читается
 * как «всё хорошо».
 */
export default class SummaryReporter implements Reporter {
  private failed: string[] = [];
  private skipped: string[] = [];
  private passed = 0;

  onTestEnd(test: TestCase, result: TestResult): void {
    const name = `${test.location.file.split('/').pop()}: ${test.title}`;
    if (result.status === 'passed') this.passed += 1;
    else if (result.status === 'skipped') this.skipped.push(name);
    else this.failed.push(name);
  }

  onEnd(result: FullResult): void {
    const total = this.passed + this.failed.length + this.skipped.length;
    process.stdout.write(
      `\n── СВОДКА ПРОГОНА ──────────────────────────────\n` +
        `  всего сценариев: ${total} · зелёных: ${this.passed} · КРАСНЫХ: ${this.failed.length} · пропущено: ${this.skipped.length}\n`,
    );
    if (this.failed.length) {
      process.stdout.write('  🔴 красные:\n');
      for (const n of this.failed) process.stdout.write(`     ${n}\n`);
    }
    if (this.skipped.length) {
      // Пропущенный сторож не сторожит. Печатаем поимённо, чтобы это было видно, а не
      // растворялось в слове «skipped».
      process.stdout.write('  ⚠️ пропущены (под флагом — значит сегодня не сторожат):\n');
      for (const n of this.skipped) process.stdout.write(`     ${n}\n`);
    }
    process.stdout.write(`  итог: ${result.status}\n\n`);
  }
}
