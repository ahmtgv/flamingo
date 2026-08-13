import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  type MyRepetitionQueueQuery,
  type ReviewRating,
  useMyAchievementsQuery,
  useMyRepetitionProgressQuery,
  useMyRepetitionQueueQuery,
  useReviewWordMutation,
} from '@/entities/graphql/generated';
import { Button } from '@/shared/ui';

import { intervalMinutes, RATINGS, schedule } from '../model/scheduler';
import styles from './repetition.module.css';

type Card = MyRepetitionQueueQuery['myRepetitionQueue'][number];

/**
 * «Повторение» — the learner's own queue (R4.4).
 *
 * FSRS runs here, in the browser (`ts-fsrs`, MIT; spec §7.3 — deliberately not SM-2), and
 * the server records the result. Every button says when the word will come back, because
 * that is the only thing the four grades actually mean.
 *
 * 🔴 There is nothing on this screen about anybody else. The numbers are one person's own,
 * and the only benchmark is their own longest streak. That is not a UI restraint that could
 * be relaxed later — the contract has no field that would let it be.
 */
export function RepetitionScreen() {
  const { t } = useTranslation('repetition');
  const queue = useMyRepetitionQueueQuery({ variables: { limit: 20 } });
  const progress = useMyRepetitionProgressQuery();
  const badges = useMyAchievementsQuery();
  const [reviewWord] = useReviewWordMutation();

  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [failed, setFailed] = useState(false);

  const cards: Card[] = queue.data?.myRepetitionQueue ?? [];
  const card = cards[index] ?? null;
  const stats = progress.data?.myRepetitionProgress;

  async function answer(card: Card, rating: ReviewRating) {
    setFailed(false);
    const next = schedule(card, rating);
    try {
      await reviewWord({
        variables: {
          cardId: card.id,
          rating,
          stability: next.stability,
          difficulty: next.difficulty,
          dueAt: next.dueAt,
          state: next.state,
          learningSteps: next.learningSteps,
        },
      });
      setRevealed(false);
      setIndex((i) => i + 1);
      await progress.refetch();
      await badges.refetch();
    } catch {
      setFailed(true);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.sub}>{t('sub')}</p>
      </header>

      {stats && <Stats stats={stats} />}

      {queue.loading && !queue.data ? (
        <p className={styles.hint}>…</p>
      ) : card ? (
        <>
          <ReviewCard card={card} revealed={revealed} />
          {revealed ? (
            <div className={styles.ratings} role="group" aria-label={t('ratings')}>
              {RATINGS.map((rating) => (
                <button
                  key={rating}
                  type="button"
                  className={styles.rating}
                  onClick={() => void answer(card, rating)}
                >
                  {t(`rating.${rating}`)}
                  <span className={styles.when}>{when(intervalMinutes(card, rating), t)}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className={styles.reveal}>
              <Button onClick={() => setRevealed(true)}>{t('reveal')}</Button>
            </div>
          )}
          <p className={styles.hint}>{t('left', { done: index, total: cards.length })}</p>
        </>
      ) : (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>{t(cards.length ? 'finished' : 'nothingDue')}</p>
          <p className={styles.hint}>{t('nothingDueHint')}</p>
        </div>
      )}

      {failed && (
        <p className={styles.failed} role="alert">
          {t('failed')}
        </p>
      )}

      <Badges keys={(badges.data?.myAchievements ?? []).map((a) => a.key)} />
    </div>
  );
}

type Progress = NonNullable<
  ReturnType<typeof useMyRepetitionProgressQuery>['data']
>['myRepetitionProgress'];

function Stats({ stats }: { stats: Progress }) {
  const { t } = useTranslation('repetition');
  return (
    <div className={styles.stats}>
      <Stat value={stats.due} label={t('stat.due')} />
      <Stat value={stats.total} label={t('stat.total')} />
      <Stat value={stats.mastered} label={t('stat.mastered')} />
      <Stat
        value={stats.currentStreak}
        label={t('stat.streak')}
        note={t('stat.best', { count: stats.longestStreak })}
      />
    </div>
  );
}

function Stat({ value, label, note }: { value: number; label: string; note?: string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
      {note && <span className={`${styles.statLabel} ${styles.best}`}>{note}</span>}
    </div>
  );
}

/** Recognition: the word, then its meaning. The licence rides along, as it does everywhere. */
function ReviewCard({ card, revealed }: { card: Card; revealed: boolean }) {
  const { t } = useTranslation('repetition');
  const example = card.item.examples[0];
  return (
    <section className={styles.card} aria-label={card.item.lemma}>
      <p className={styles.front}>{card.item.lemma}</p>
      {card.item.ipa && <p className={styles.ipa}>{card.item.ipa}</p>}
      {revealed ? (
        <div className={styles.back}>
          <p className={styles.answer}>{card.item.translationRu}</p>
          {card.item.definitionRu && <p className={styles.definition}>{card.item.definitionRu}</p>}
          {example && (
            <p className={styles.example}>
              {example.text}
              <br />
              <span className={styles.credit}>
                {example.credit.license} · {example.credit.attribution}
              </span>
            </p>
          )}
          <p className={styles.credit}>
            {card.item.credit.license} · {card.item.credit.attribution}
          </p>
        </div>
      ) : (
        <p className={styles.ipa}>{t('think')}</p>
      )}
    </section>
  );
}

function Badges({ keys }: { keys: string[] }) {
  const { t } = useTranslation('repetition');
  if (keys.length === 0) return null;
  return (
    <div className={styles.badges} aria-label={t('achievements')}>
      {keys.map((key) => (
        <span className={styles.badge} key={key}>
          {t(`achievement.${key}`)}
        </span>
      ))}
    </div>
  );
}

type Translate = (key: string, vars?: Record<string, unknown>) => string;

/** «через 10 минут» / «через 3 дня» — the only thing the four grades actually mean. */
function when(minutes: number, t: Translate): string {
  if (minutes < 60) return t('in.minutes', { count: Math.max(1, minutes) });
  if (minutes < 60 * 24) return t('in.hours', { count: Math.round(minutes / 60) });
  return t('in.days', { count: Math.round(minutes / (60 * 24)) });
}
