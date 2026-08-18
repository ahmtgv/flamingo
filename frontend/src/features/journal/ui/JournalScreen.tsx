import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { useCourseJournalQuery } from '@/entities/graphql/generated';
import { ErrorState } from '@/shared/ui';

import styles from './journal.module.css';

/**
 * ЖУРНАЛ ПРЕДМЕТА — ПЕРВАЯ ПОЛОВИНА (наряд 36 §5).
 *
 * 🔴 ЧТО ЭТО ЧИНИТ. Кнопка «Открыть журнал» на листе 01 — а лист контракт — вела в очередь
 * проверки СТАРОЙ рамы: экран прежнего кабинета со своей шапкой, из которого назад дороги
 * нет. Это «смесь» в самом дорогом виде: не «экран старый», а новый и старый склеены
 * переходом. Кнопку переименовать нельзя, старый экран расширять нельзя — значит нужен свой.
 *
 * ⚠️ ЧЕГО ЗДЕСЬ ЕЩЁ НЕТ, и это сказано вслух, а не умолчано: правка оценки прямо в клетке,
 * выгрузка, свод по четверти, переход из клетки в работу. Первая половина — это «кто был и
 * что получил», то, ради чего журнал открывают.
 */
export function JournalScreen() {
  const { t } = useTranslation(['journal', 'common']);
  const { courseId = '' } = useParams();
  const { data, loading, error, refetch } = useCourseJournalQuery({
    variables: { courseId },
    skip: !courseId,
  });

  const journal = data?.courseJournal;

  /** Клетки приходят плоским списком — раскладываем в таблицу по (ученик, занятие). */
  const cellAt = useMemo(() => {
    const map = new Map<string, { attendance: string; score?: number | null }>();
    for (const cell of journal?.cells ?? []) {
      map.set(`${cell.studentId}:${cell.sessionId}`, {
        attendance: cell.attendance,
        score: cell.score,
      });
    }
    return map;
  }, [journal]);

  if (error && !data) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (loading && !data) return <p className={styles.note}>{t('common:actions.loading')}</p>;
  if (!journal) return <p className={styles.note}>{t('journal:missing')}</p>;

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>{t('journal:title', { subject: journal.title })}</h1>
        <p className={styles.sub}>{t('journal:sub')}</p>
      </header>

      {journal.students.length === 0 || journal.sessions.length === 0 ? (
        <p className={styles.note}>{t('journal:empty')}</p>
      ) : (
        <div className={styles.scroll}>
          <table className={styles.table}>
            <caption className={styles.caption}>{t('journal:caption')}</caption>
            <thead>
              <tr>
                <th scope="col" className={styles.who}>
                  {t('journal:student')}
                </th>
                {journal.sessions.map((session) => (
                  <th key={session.sessionId} scope="col" className={styles.day}>
                    <span className={styles.dayNum}>
                      {session.startAt
                        ? new Date(session.startAt).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'numeric',
                          })
                        : '—'}
                    </span>
                    <span className={styles.dayTitle}>{session.title}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {journal.students.map((student) => (
                <tr key={student.studentId}>
                  <th scope="row" className={styles.who}>
                    {student.name}
                    {/* Безотметочный ученик назван прямо: пустая строка иначе читается как
                        «не сдавал», а он сдавал — просто отметок ему не ставят (§34.4). */}
                    {student.markless && (
                      <span className={styles.markless}>{t('journal:markless')}</span>
                    )}
                  </th>
                  {journal.sessions.map((session) => {
                    const cell = cellAt.get(`${student.studentId}:${session.sessionId}`);
                    const wasThere = cell?.attendance ?? '';
                    return (
                      <td key={session.sessionId} className={styles.cell}>
                        <span className={styles.score}>
                          {cell?.score != null ? cell.score : ''}
                        </span>
                        <span className={styles.att} data-att={wasThere}>
                          {wasThere ? t(`journal:attendance.${wasThere.toLowerCase()}`, { defaultValue: wasThere }) : ''}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className={styles.note}>{t('journal:notYet')}</p>
    </div>
  );
}
