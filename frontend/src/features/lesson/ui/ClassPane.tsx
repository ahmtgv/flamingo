import { useTranslation } from 'react-i18next';

import { type Participant, tileName } from '../classLayout';

import { ClassVideo } from './ClassVideo';

import styles from './classpane.module.css';

/** Шире этой доли лица перестают быть колонкой и становятся решёткой (лист, правило 03). */
export const GRID_FROM = 45;

/**
 * Колонка класса — правая часть кадра комнаты, лист «Комната урока».
 *
 * 🔴 СТОИТ ВСЕГДА. Прежде класс был окном: чтобы увидеть людей, надо было убрать доску.
 * Половина языкового урока — разговор, и требовать ради него действия неправильно.
 *
 * Состав сверху вниз: внимание класса · лица · своя камера с пояснением. Шапка внимания
 * занимает место ВО ВСЕХ состояниях (ПРАВИЛА 6.6): без данных — прочерк и ровная полоска
 * той же высоты. Иначе в момент приезда первых чисел вся колонка прыгает.
 */
/**
 * Полоска внимания под именем. Место занято ВСЕГДА (ПРАВИЛА 6.6): без данных полоска пустая,
 * но той же высоты — иначе плитки дёргаются каждые две секунды, когда числа приходят и уходят.
 * Цветом не красится: длина уже несёт значение (ПРАВИЛА 5.4).
 */
function PupilAttention({ value }: { value: number | null }) {
  return (
    <span className={styles.attBar} aria-hidden="true">
      <i style={{ inlineSize: value === null ? '0%' : `${Math.round(value)}%` }} />
    </span>
  );
}

export function ClassPane({
  teacher,
  pupils,
  version,
  isTeacher,
  ratio,
  attention,
  spark,
  selfStream,
  onPin,
  attentionFor,
  loading,
}: {
  teacher?: Participant;
  pupils: Participant[];
  version?: number;
  isTeacher: boolean;
  /** Доля кадра под колонкой, в процентах: от неё зависит колонка или решётка. */
  ratio: number;
  /** Среднее внимание класса или `null`, пока чисел нет. */
  attention: number | null;
  /** Последние значения для искры. Пустой — полоска ровная, место всё равно занято. */
  spark: number[];
  selfStream?: MediaStream | null;
  onPin?: (id: string) => void;
  /** Свежее внимание ученика или `null`: молчание — это тоже ответ, а не ноль. */
  attentionFor?: (id: string) => number | null;
  loading?: boolean;
}) {
  const { t } = useTranslation(['room', 'desktop']);
  const grid = ratio >= GRID_FROM;

  /**
   * 🔴 УЧЕНИК ВИДИТ ТОЛЬКО ПРЕПОДАВАТЕЛЯ (решение владельца Р5.1).
   * Это не про экран, а про канал: тридцать чужих дорожек рвут урок на слабой связи.
   * Караул `videoStrip.p51.test.tsx` держит это правило с прошлого наряда.
   */
  const faces = isTeacher ? pupils : [];

  return (
    <>
      <header className={styles.att} data-geo="внимание класса">
        <span className={styles.attLabel}>{t('room:classPane.attention')}</span>
        <span className={styles.attValue}>{attention === null ? '—' : Math.round(attention)}</span>
        {/* Искра — не акцент: длина столбика уже несёт значение (ПРАВИЛА 5.4). */}
        <span className={styles.spark} aria-hidden="true">
          {Array.from({ length: 24 }, (_, i) => (
            <i key={i} style={{ blockSize: spark[i] ? `${Math.round(spark[i] * 0.18)}px` : '2px' }} />
          ))}
        </span>
      </header>

      <div className={styles.tiles} data-geo="решётка лиц" data-grid={grid || undefined}>
        {/*
          🔴 ПРЕПОДАВАТЕЛЬ В РЕШЁТКЕ — ТОЛЬКО У УЧЕНИКА.
          Замер двумя браузерами показал лицо преподавателя дважды: один раз плиткой в
          решётке, второй — своей камерой в подвале. У ведущего решётка это КЛАСС, а он сам
          стоит внизу, как у всех. У ученика наоборот: в решётке ведущий, и он один.
        */}
        {teacher && !isTeacher && (
          <div className={styles.tile} data-teacher="true" data-speaking={teacher.speaking || undefined}>
            <ClassVideo participant={teacher} version={version} />
            <span className={styles.ini} aria-hidden="true">
              {teacher.initials}
            </span>
            <span className={styles.name}>
              {isTeacher ? teacher.name : t('desktop:class.leading', { name: teacher.name })}
            </span>
          </div>
        )}

        {/*
          ПРАВИЛА 6.2: пусто объясняет словами, что здесь будет. Тёмный прямоугольник без
          единого слова — не состояние, а недоделка: преподаватель не понимает, никто не
          зашёл или сломалось.
        */}
        {isTeacher && faces.length === 0 && (
          <p className={styles.empty}>{t('room:classPane.nobodyYet')}</p>
        )}

        {faces.map((p) => (
          <div
            key={p.id}
            className={styles.tile}
            data-speaking={p.speaking || undefined}
            data-degraded={p.degraded || undefined}
          >
            <ClassVideo participant={p} version={version} />
            <span className={styles.ini} aria-hidden="true">
              {p.initials}
            </span>
            <span className={styles.name}>{tileName(p.name)}</span>
            {/* Единственная акцентная ЗАЛИВКА на экране урока принадлежит поднятой руке. */}
            {p.handRaised && <span className={styles.hand}>{t('desktop:class.handRaised')}</span>}
            {p.degraded && <span className={styles.degraded}>{t('desktop:class.degraded')}</span>}
            {onPin && (
              <button type="button" className={styles.pin} onClick={() => onPin(p.id)}>
                {t('desktop:class.pin')}
              </button>
            )}
            <PupilAttention value={attentionFor?.(p.id) ?? null} />
          </div>
        ))}
      </div>

      <footer className={styles.self}>
        <div className={styles.selfTile}>
          <ClassVideo participant={{ id: 'self', name: '', initials: '', isSelf: true, selfStream }} />
          <span className={styles.selfLabel}>
            {loading ? t('room:classPane.cameraStarting') : t('room:classPane.yourCamera')}
          </span>
          <span className={styles.name}>{t('desktop:class.self')}</span>
        </div>
        <p className={styles.note}>
          {isTeacher ? t('room:classPane.noteTeacher') : t('room:classPane.notePupil')}
        </p>
      </footer>
    </>
  );
}
