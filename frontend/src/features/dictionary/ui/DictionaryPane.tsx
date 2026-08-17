import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  type LessonWordsQuery,
  useAddWordToMyListMutation,
  useExternalDictionariesQuery,
  useLessonWordsQuery,
  useLookupWordQuery,
  usePutWordOnBoardMutation,
  useShowWordToClassMutation,
  useWordShownSubscription,
} from '@/entities/graphql/generated';
import { Button } from '@/shared/ui';

import styles from './dictionary.module.css';

type Word = LessonWordsQuery['lessonWords'][number];
type Example = Word['examples'][number];

/**
 * The «словарь» pane of atlas sheet 02.
 *
 * The owner's rule from 12.08 is the whole shape of this component: only OPEN bases go inside
 * the product, and a closed dictionary is a link that opens in a new tab. So the card renders
 * content we are licensed to render, **with the licence printed on it**, and Cambridge is an
 * `<a target="_blank">` and nothing else. Nothing here fetches a closed dictionary, and a
 * test asserts the absence rather than trusting the next reader to notice.
 */
export function DictionaryPane({
  lessonId,
  sessionId,
  isTeacher,
}: {
  lessonId?: string | null;
  sessionId?: string | null;
  isTeacher?: boolean;
}) {
  const { t } = useTranslation('dictionary');
  const [query, setQuery] = useState('');
  const [lemma, setLemma] = useState('');
  const [chosen, setChosen] = useState<string | null>(null);

  const lesson = useLessonWordsQuery({
    variables: { lessonId: lessonId ?? '' },
    skip: !lessonId,
  });
  const found = useLookupWordQuery({ variables: { lemma }, skip: !lemma });
  const external = useExternalDictionariesQuery();

  // «Показать всем»: the teacher points, and every pane in the room turns to that word.
  const shown = useWordShownSubscription({
    variables: { sessionId: sessionId ?? '' },
    skip: !sessionId,
  });
  const shownLemma = shown.data?.wordShown.lemma;
  useEffect(() => {
    if (shownLemma) {
      setLemma(shownLemma);
      setQuery(shownLemma);
      setChosen(null);
    }
  }, [shownLemma]);

  const lessonWords: Word[] = lesson.data?.lessonWords ?? [];
  const searched: Word[] = found.data?.lookupWord ?? [];

  // The card is EVERY sense of one lemma, stacked — never the first row of a list that
  // happens to contain two meanings of the same word. Which lemma: the one explicitly
  // chosen, else the one searched for, else the lesson's first.
  const activeLemma = chosen ?? (lemma || lessonWords[0]?.lemma) ?? '';
  const pool = !chosen && lemma ? searched : lessonWords;
  const senses = pool.filter((w) => w.lemma.toLowerCase() === activeLemma.toLowerCase());

  return (
    <div className={styles.pane}>
      <form
        className={styles.search}
        onSubmit={(e) => {
          e.preventDefault();
          setChosen(null);
          setLemma(query.trim());
        }}
      >
        <input
          className={styles.input}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('search')}
          aria-label={t('search')}
        />
        <Button size="sm" type="submit">
          {t('find')}
        </Button>
      </form>

      {senses.length === 0 ? (
        <p className={styles.hint}>{lemma ? t('notFound', { lemma }) : t('empty')}</p>
      ) : (
        <WordCard
          senses={senses}
          lessonId={lessonId}
          sessionId={sessionId}
          isTeacher={Boolean(isTeacher)}
        />
      )}

      {/* The owner decision, said in the pane rather than kept in a commit message. */}
      <p className={styles.policy}>
        {t('policy.open')} <b>{t('policy.closed')}</b>
      </p>

      {lessonWords.length > 0 && (
        <div className={styles.row}>
          <span className={styles.rowText}>
            <span className={styles.rowName}>{t('lessonWords.title')}</span>
            <span className={styles.rowSub}>
              {t('lessonWords.sub', { count: lessonWords.length })}
            </span>
          </span>
          <button
            type="button"
            className={styles.rowGo}
            onClick={() => {
              setChosen(lessonWords[0].lemma);
              setLemma('');
            }}
          >
            {t('open')}
          </button>
        </div>
      )}

      {(external.data?.externalDictionaries ?? []).map((entry) => (
        <div className={styles.row} key={entry.key}>
          <span className={styles.rowText}>
            <span className={styles.rowName}>{entry.name}</span>
            <span className={styles.rowSub}>{t('external.sub')}</span>
          </span>
          {/* A LINK, in a new tab. Never an import, never a request from us. */}
          <a
            className={styles.rowGo}
            href={entry.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('external.open', { name: entry.name })}
          >
            ↗
          </a>
        </div>
      ))}
    </div>
  );
}

/** One lemma, all of its senses — with the licence under each part that has one. */
function WordCard({
  senses,
  lessonId,
  sessionId,
  isTeacher,
}: {
  senses: Word[];
  lessonId?: string | null;
  sessionId?: string | null;
  isTeacher: boolean;
}) {
  const { t } = useTranslation('dictionary');
  const head = senses[0];
  const [addWord, { data: added }] = useAddWordToMyListMutation();
  // The board is on screen next to this pane, so the sticker must simply appear. Naming the
  // query refetches it only when it is actually mounted; in a pop-out window it costs nothing.
  const [onBoard, { data: boarded }] = usePutWordOnBoardMutation({ refetchQueries: ['Board'] });
  const [showAll, { data: showedAll }] = useShowWordToClassMutation();
  const [failed, setFailed] = useState(false);

  async function run(action: () => Promise<unknown>) {
    setFailed(false);
    try {
      await action();
    } catch {
      setFailed(true);
    }
  }

  return (
    <section className={styles.card} aria-label={head.lemma}>
      <div className={styles.top}>
        <span className={styles.lemma}>{head.lemma}</span>
        {head.ipa && <span className={styles.ipa}>{head.ipa}</span>}
        {head.cefrLevel && <span className={styles.level}>{head.cefrLevel}</span>}
        {head.pronunciationId && (
          /* 🔴 НАРИСОВАНО И МОЛЧИТ — четвёртое состояние, которого быть не должно (§1.3).
             Кнопка рисовалась включённой у каждого слова с `pronunciationId` и НЕ ИМЕЛА
             обработчика вовсе. Звука за ней тоже нет: в схеме только идентификатор, ни
             ссылки, ни выдачи файла — сервер не умеет отдать произношение никак.
             Пока умеет только молчать — пусть молчит ЧЕСТНО: выключенная кнопка с подписью
             честнее живой, которая проглатывает нажатие (решение владельца, PROMPT_16 §5). */
          <button
            type="button"
            className={styles.say}
            aria-label={t('say')}
            disabled
            title={t('saySoon')}
          >
            ▶
          </button>
        )}
      </div>

      {senses.map((sense) => (
        <div className={styles.sense} key={sense.id}>
          <p className={styles.pos}>{t(`pos.${sense.pos}`)}</p>
          <p className={styles.def}>{sense.definitionRu || sense.translationRu}</p>
          {sense.examples.map((example) => (
            <ExampleLine key={example.id} example={example} />
          ))}
          <p className={styles.credit}>{creditLine(sense.credit)}</p>
        </div>
      ))}

      <div className={styles.acts}>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => void run(() => addWord({ variables: { itemId: head.id } }))}
        >
          {t('act.mine')}
        </Button>
        {lessonId && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void run(() => onBoard({ variables: { lessonId, itemId: head.id } }))}
          >
            {t('act.board')}
          </Button>
        )}
        {isTeacher && sessionId && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void run(() => showAll({ variables: { sessionId, itemId: head.id } }))}
          >
            {t('act.showAll')}
          </Button>
        )}
      </div>

      {added && <p className={styles.done}>{t('act.mineDone')}</p>}
      {boarded && <p className={styles.done}>{t('act.boardDone')}</p>}
      {showedAll && <p className={styles.done}>{t('act.showAllDone')}</p>}
      {failed && (
        <p className={styles.failed} role="alert">
          {t('act.failed')}
        </p>
      )}
    </section>
  );
}

function ExampleLine({ example }: { example: Example }) {
  return (
    <p className={styles.example}>
      {example.text}
      {example.translationRu && <span className={styles.exampleRu}>{example.translationRu}</span>}
      <span className={styles.exampleRu}>{creditLine(example.credit)}</span>
    </p>
  );
}

/**
 * The licence line, in the card.
 *
 * Not composed through i18n: a licence name and a rights holder are not UI copy to be
 * translated — «CC BY 4.0» is «CC BY 4.0» in every locale, and paraphrasing an attribution is
 * how you stop complying with it.
 */
function creditLine(credit: Word['credit']): string {
  const name = SOURCE_NAME[credit.source] ?? credit.source;
  // An importer that already put the base's name into the attribution should not make the
  // line read «Tatoeba · CC BY 2.0 FR · Tatoeba · автор CK». Dropping the repetition is safe
  // — the name is still there, once — and the alternative is a licence line nobody reads.
  const credited = credit.attribution.startsWith(name)
    ? credit.attribution.slice(name.length).replace(/^\s*[·—-]\s*/, '')
    : credit.attribution;
  return [name, credit.license, credited].filter(Boolean).join(' · ');
}

const SOURCE_NAME: Record<string, string> = {
  WORDNET: 'Open English WordNet',
  TATOEBA: 'Tatoeba',
  COMMON_VOICE: 'Mozilla Common Voice',
  OWN: 'Flamingo',
};
