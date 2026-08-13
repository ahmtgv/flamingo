import { useTranslation } from 'react-i18next';

import { useCourseBoardsQuery } from '@/entities/graphql/generated';

import styles from './board.module.css';

/**
 * «Доска прошлого урока» — the boards this course has already left behind.
 *
 * Sheet 02 asks for last time's board to be there when you come back, which is the whole
 * reason a board is saved into the lesson's materials rather than living only on the wire.
 */
export function PastBoards({ courseId }: { courseId: string }) {
  const { t } = useTranslation('board');
  const { data } = useCourseBoardsQuery({ variables: { courseId } });
  const boards = data?.courseBoards ?? [];

  if (boards.length === 0) return <p className={styles.hint}>{t('past.empty')}</p>;

  return (
    <>
      <p className={styles.hint}>{t('past.title')}</p>
      {boards.map((b) => (
        <p key={b.id} className={styles.state}>
          {t('past.openedAt', {
            lesson: b.lessonTitle,
            date: new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(
              new Date(b.savedAt),
            ),
          })}
        </p>
      ))}
    </>
  );
}
