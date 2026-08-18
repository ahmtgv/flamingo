import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import {
  claimLoudConnection,
  useConnection,
  useLoudConnectionClaimed,
  watchBrowserNetwork,
} from '@/shared/lib/connection/connectionStore';

import styles from './connectionLine.module.css';

/**
 * ОДНА СТРОКА ПРО СВЯЗЬ НА ВЕСЬ ПРОДУКТ (решение владельца §32.3, наряд 34 §2.2).
 *
 * Громкость выбирает экран, слово — общий механизм:
 *
 * * `quiet` — обычные экраны. Строка появляется, только когда есть что сказать, и не спорит
 *   с тем, чем человек занят.
 * * `loud` — урок. Здесь молчать нельзя: преподаватель ведёт занятие и должен знать, что
 *   класс перестал его видеть, ДО того как двадцать минут проговорит в пустоту.
 *
 * 🔴 ГОВОРИМ, ЧТО ПРОИСХОДИТ, А НЕ «ЧТО-ТО ПОШЛО НЕ ТАК». Тексты названы по состоянию канала
 * («связь пропала», «связь слабая — идёт медленно»), а не по коду отказа. Это буквально
 * требование наряда, и оно же — вывод замера: на всех четырёх ступенях слабого канала экран
 * говорил одно и то же, и человек не мог отличить «медленно» от «сломалось».
 *
 * ⚠️ `good` и `unmeasured` не показываются НИКОГДА. Строка, которая горит зелёным «связь в
 * порядке», — это шум на каждом экране ради состояния, которое и так очевидно: всё работает.
 */
export function ConnectionLine({ tone = 'quiet' }: { tone?: 'quiet' | 'loud' }) {
  const { t } = useTranslation('common');
  const { word } = useConnection();
  const loudElsewhere = useLoudConnectionClaimed();

  // Слушатель сети живёт, пока строка на экране: без него «нет сети» узнавалось бы только
  // из следующего запроса, а его может не быть минутами.
  useEffect(() => watchBrowserNetwork(), []);
  // Урок забирает разговор о связи себе — рама в это время молчит.
  useEffect(() => (tone === 'loud' ? claimLoudConnection() : undefined), [tone]);

  if (tone === 'quiet' && loudElsewhere) return null;

  if (word === 'good' || word === 'unmeasured') return null;

  return (
    <p
      className={`${styles.line} ${tone === 'loud' ? styles.loud : styles.quiet} ${styles[word]}`}
      // Урок — единственное место, где это важнее того, что человек читает сейчас.
      role={tone === 'loud' ? 'alert' : 'status'}
    >
      <span aria-hidden="true" className={styles.dot} />
      {t(`connection.${word}.${tone === 'loud' ? 'lesson' : 'quiet'}`)}
    </p>
  );
}
