import { type MockedResponse } from '@apollo/client/testing';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  AddWordToMyListDocument,
  ExternalDictionariesDocument,
  type LessonWordsQuery,
  LessonWordsDocument,
  LookupWordDocument,
  PutWordOnBoardDocument,
  ShowWordToClassDocument,
  WordShownDocument,
} from '@/entities/graphql/generated';
import { renderWithProviders } from '@/test/renderWithProviders';

import { DictionaryPane } from './DictionaryPane';

const LESSON = 'les-1-12';
const SESSION = 'ses-1';

type Word = LessonWordsQuery['lessonWords'][number];

const wordnet = {
  __typename: 'Attribution' as const,
  source: 'WORDNET' as const,
  license: 'CC BY 4.0',
  attribution: 'Princeton WordNet · Open English WordNet team',
  sourceUrl: 'https://en-word.net/',
};

const tatoeba = {
  __typename: 'Attribution' as const,
  source: 'TATOEBA' as const,
  license: 'CC BY 2.0 FR',
  attribution: 'автор предложения CK',
  sourceUrl: 'https://tatoeba.org/en/sentences/show/1',
};

const word = (over: Partial<Word> & { id: string }): Word => ({
  __typename: 'LexicalItem',
  lemma: 'crossroads',
  pos: 'NOUN',
  senseId: 'oewn-03088580-n',
  cefrLevel: 'A2',
  ipa: '/ˈkrɒs.rəʊdz/',
  definitionRu: 'место, где пересекаются две дороги; перекрёсток',
  translationRu: 'перекрёсток',
  pronunciationId: null,
  credit: wordnet,
  examples: [],
  ...over,
});

const lessonWordsMock = (words: Word[]): MockedResponse => ({
  request: { query: LessonWordsDocument, variables: { lessonId: LESSON } },
  result: { data: { lessonWords: words } },
});

const externalMock = (): MockedResponse => ({
  request: { query: ExternalDictionariesDocument, variables: {} },
  result: {
    data: {
      externalDictionaries: [
        {
          __typename: 'ExternalDictionary',
          key: 'cambridge',
          name: 'Cambridge Dictionary',
          url: 'https://dictionary.cambridge.org/dictionary/english/',
        },
      ],
    },
  },
});

/** «Показать всем» rides a subscription; an empty stream keeps the tests quiet about it
 *  without pretending the wire is not there. */
const wordShownMock = (): MockedResponse => ({
  request: { query: WordShownDocument, variables: { sessionId: SESSION } },
  result: {
    data: {
      wordShown: {
        __typename: 'WordShown',
        sessionId: SESSION,
        itemId: 'lx-1',
        lemma: 'crossroads',
      },
    },
  },
  delay: Infinity, // the wire is open; nothing came down it during the test
});

const render = (mocks: MockedResponse[], props: Record<string, unknown> = {}) =>
  renderWithProviders(
    <DictionaryPane lessonId={LESSON} sessionId={SESSION} isTeacher={false} {...props} />,
    { mocks: [...mocks, wordShownMock()] },
  );

describe('DictionaryPane — the licence is IN the card', () => {
  it('prints the source, the licence and the credit under the sense', async () => {
    render([lessonWordsMock([word({ id: 'lx-1' })]), externalMock()]);
    expect(
      await screen.findByText(
        /Open English WordNet · CC BY 4\.0 · Princeton WordNet · Open English WordNet team/,
      ),
    ).toBeInTheDocument();
  });

  it('an example carries its OWN credit — a Tatoeba sentence is not a WordNet gloss', async () => {
    render([
      lessonWordsMock([
        word({
          id: 'lx-1',
          examples: [
            {
              __typename: 'LexicalExample',
              id: 'lxe-1',
              text: 'Turn right at the crossroads.',
              translationRu: 'Поверни направо на перекрёстке.',
              credit: tatoeba,
            },
          ],
        }),
      ]),
      externalMock(),
    ]);

    expect(
      await screen.findByText(/Tatoeba · CC BY 2\.0 FR · автор предложения CK/),
    ).toBeInTheDocument();
  });

  it('states the open-bases-only rule in the pane, not only in a commit message', async () => {
    render([lessonWordsMock([word({ id: 'lx-1' })]), externalMock()]);
    expect(
      await screen.findByText(/только открытые базы: Open English WordNet, Tatoeba, Common Voice/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Закрытые словари \(Cambridge и другие\) не втягиваются внутрь/),
    ).toBeInTheDocument();
  });
});

describe('DictionaryPane — a closed dictionary is a link and nothing else', () => {
  it('Cambridge is an anchor that opens in a new tab, safely', async () => {
    render([lessonWordsMock([word({ id: 'lx-1' })]), externalMock()]);
    const link = await screen.findByRole('link', {
      name: 'Открыть Cambridge Dictionary в новой вкладке',
    });
    expect(link).toHaveAttribute('href', 'https://dictionary.cambridge.org/dictionary/english/');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('the component never fetches a closed dictionary', () => {
    // The owner decision, as a source assertion. A closed base may appear as a URL rendered
    // into an anchor — never as an argument to anything that performs a request.
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(here, 'DictionaryPane.tsx'), 'utf8');
    const code = source
      .split('\n')
      .filter((line) => !line.trim().startsWith('*') && !line.trim().startsWith('//'))
      .join('\n');
    for (const caller of ['fetch(', 'XMLHttpRequest', 'axios', 'import(']) {
      expect(code).not.toContain(caller);
    }
    // And no closed dictionary is hardcoded here at all: the list comes from the server.
    for (const closed of ['cambridge', 'oxford', 'longman', 'merriam']) {
      expect(code.toLowerCase()).not.toContain(closed);
    }
  });
});

describe('DictionaryPane — the card stacks the senses', () => {
  it('shows both senses of a lemma, each with its own definition', async () => {
    render([
      lessonWordsMock([
        word({ id: 'lx-1', definitionRu: 'перекрёсток' }),
        word({ id: 'lx-2', senseId: 'oewn-15266164-n', definitionRu: 'момент важного решения' }),
      ]),
      externalMock(),
    ]);

    const card = await screen.findByRole('region', { name: 'crossroads' });
    expect(within(card).getByText('перекрёсток')).toBeInTheDocument();
    expect(within(card).getByText('момент важного решения')).toBeInTheDocument();
  });

  it('a search that finds nothing says so and still offers the outside link', async () => {
    render([
      lessonWordsMock([]),
      externalMock(),
      {
        request: { query: LookupWordDocument, variables: { lemma: 'zzz' } },
        result: { data: { lookupWord: [] } },
      },
    ]);

    await userEvent.type(await screen.findByRole('textbox', { name: 'Найти слово' }), 'zzz');
    await userEvent.click(screen.getByRole('button', { name: 'Найти' }));

    expect(await screen.findByText(/«zzz» в наших открытых базах пока нет/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Cambridge/ })).toBeInTheDocument();
  });
});

describe('DictionaryPane — the three actions of the sheet', () => {
  it('«в мои слова» sends the word into the repetition queue', async () => {
    let sent: string | null = null;
    render([
      lessonWordsMock([word({ id: 'lx-1' })]),
      externalMock(),
      {
        request: { query: AddWordToMyListDocument, variables: { itemId: 'lx-1' } },
        result: () => {
          sent = 'lx-1';
          return {
            data: {
              addWordToMyList: {
                __typename: 'SrsCard',
                id: 'srs-1',
                state: 'NEW',
                dueAt: new Date().toISOString(),
              },
            },
          };
        },
      },
    ]);

    await userEvent.click(await screen.findByRole('button', { name: 'В мои слова' }));
    expect(sent).toBe('lx-1');
    expect(
      await screen.findByText('Слово в вашем списке — придёт на повторение.'),
    ).toBeInTheDocument();
  });

  it('«на доску» sends the word to the lesson board', async () => {
    let sent: unknown = null;
    render([
      lessonWordsMock([word({ id: 'lx-1' })]),
      externalMock(),
      {
        request: { query: PutWordOnBoardDocument, variables: { lessonId: LESSON, itemId: 'lx-1' } },
        result: () => {
          sent = { lessonId: LESSON, itemId: 'lx-1' };
          return { data: { putWordOnBoard: 'be-1' } };
        },
      },
    ]);

    await userEvent.click(await screen.findByRole('button', { name: 'На доску' }));
    expect(sent).toEqual({ lessonId: LESSON, itemId: 'lx-1' });
  });

  it('«показать всем» belongs to the teacher and to nobody else', async () => {
    render([lessonWordsMock([word({ id: 'lx-1' })]), externalMock()]);
    await screen.findByRole('button', { name: 'В мои слова' });
    expect(screen.queryByRole('button', { name: 'Показать всем' })).not.toBeInTheDocument();
  });

  it('the teacher gets it, and it reports having landed', async () => {
    render(
      [
        lessonWordsMock([word({ id: 'lx-1' })]),
        externalMock(),
        {
          request: {
            query: ShowWordToClassDocument,
            variables: { sessionId: SESSION, itemId: 'lx-1' },
          },
          result: {
            data: {
              showWordToClass: {
                __typename: 'WordShown',
                sessionId: SESSION,
                itemId: 'lx-1',
                lemma: 'crossroads',
              },
            },
          },
        },
      ],
      { isTeacher: true },
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Показать всем' }));
    expect(await screen.findByText('Показано группе.')).toBeInTheDocument();
  });

  it('«на доску» is absent outside a lesson — there is no board to put it on', async () => {
    renderWithProviders(<DictionaryPane sessionId={null} lessonId={null} />, {
      mocks: [externalMock()],
    });
    await screen.findByRole('link', { name: /Cambridge/ });
    expect(screen.queryByRole('button', { name: 'На доску' })).not.toBeInTheDocument();
  });
});

describe('DictionaryPane — the credit line reads like a credit', () => {
  it('does not repeat the base name when the attribution already carries it', async () => {
    // Real import data does this: Tatoeba dumps credit «Tatoeba · <author>». The line must
    // not come out as «Tatoeba · CC BY 2.0 FR · Tatoeba · CK» — a licence nobody reads is a
    // licence nobody honours.
    render([
      lessonWordsMock([
        word({
          id: 'lx-1',
          credit: { ...wordnet, attribution: 'Open English WordNet · Princeton WordNet' },
        }),
      ]),
      externalMock(),
    ]);

    expect(
      await screen.findByText('Open English WordNet · CC BY 4.0 · Princeton WordNet'),
    ).toBeInTheDocument();
  });
});
