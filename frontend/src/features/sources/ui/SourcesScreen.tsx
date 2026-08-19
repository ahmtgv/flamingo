import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useSession } from '@/shared/hooks/useSession';
import { useNavigate } from 'react-router-dom';

import { useMySavedItemsQuery, useSaveItemMutation } from '@/entities/graphql/generated';
import { isDesktop } from '@/features/desktop/bridge';
import { HOME_ROUTE } from '@/shared/lib/homeRoute';
import { Logo } from '@/shared/ui';

import {
  type Kind,
  KINDS,
  REGIONS,
  type Source,
  SOURCES,
  type Topic,
  TOPICS,
  counts,
} from '../catalog';
import styles from './sources.module.css';

type Tab = 'world' | 'atlas' | 'live' | 'mine';
const TABS: readonly Tab[] = ['world', 'atlas', 'live', 'mine'];

/** После скольких материалов лист 12 включает каталог вместо простого списка. */
const CATALOGUE_FROM = 20;

/**
 * ХАБ «Источники мира» — лист атласа 12.
 *
 * 🔴 Экран, которого не было, при четырёх кнопках, которые на него вели. Все четыре открывали
 * `/courses` — архивный каталог курсов. Владелец назвал это первым: «При переходе в „Источники
 * Мира" получаем кабинет преподавателя, курсы».
 *
 * Три вкладки листа: «Источники мира» (полки по теме и роду), «Атлас источников» (кто в мире
 * открыл коллекции — по регионам), «Сейчас в эфире» (что идёт прямо сейчас).
 *
 * 🔴 §27.2 (решение владельца 17.08): у каждой карточки тихий уголок «^» — «в мои материалы»,
 * и четвёртая вкладка «Добавленные материалы». Сохраняется ССЫЛКА и заметка, никогда не копия:
 * лицензия остаётся у источника (RND_02 §1), поэтому «поделиться» — это передать адрес.
 *
 * ⚠️ Из меню уголка на листе сделаны две позиции из пяти — «в мои материалы» и «посмотреть
 * позднее»: ровно те, за которыми стоит рабочий механизм (`SavedItemKind`). «Напомнить»
 * требует напоминаний, которых в продукте нет; рисовать её выключенной посреди меню из двух
 * живых пунктов — шум, а живой она была бы обманом. Сказано здесь, а не заметено.
 */
export function SourcesScreen() {
  const { t } = useTranslation(['sources', 'common']);
  // Хаб открыт постороннему (наряд 40-бис §4): у гостя кабинета нет, дверь ведёт на афишу.
  const isGuest = useSession().status === 'unauthenticated';
  const home = isGuest ? '/' : HOME_ROUTE;
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('world');
  const [topic, setTopic] = useState<Topic | 'all'>('all');
  const [kind, setKind] = useState<Kind | 'all'>('all');

  const total = useMemo(counts, []);
  const mine = useMySavedItemsQuery();

  const shelf = useMemo(
    () =>
      SOURCES.filter(
        (s) => (topic === 'all' || s.topic === topic) && (kind === 'all' || s.kind === kind),
      ),
    [topic, kind],
  );

  return (
    <div className={styles.page}>
      {/* Внутри приложения шапку рисует рама (лист D1) — вторая полоса с логотипом и была
          половиной «поломанного кода». В браузере она нужна: уйти отсюда больше нечем. */}
      {!isDesktop() && (
        <header className={styles.top}>
          <button
            type="button"
            className={styles.logoBtn}
            onClick={() => navigate(home)}
            aria-label={isGuest ? t('common:actions.toLanding') : t('common:actions.toCabinet')}
          >
            <Logo />
          </button>
          <span className={styles.hubMark}>HUB</span>
          {/*
            🔴 ИЗ ХАБА НЕ БЫЛО ДОРОГИ НАЗАД (находка ревьюера Р-4, 18.08). Формально логотип
            уводил в кабинет, но об этом нельзя было догадаться: он подписан «Flamingo», а не
            тем, что делает. Человек уходил кнопкой браузера — то есть продукт заставлял
            пользоваться браузером вместо себя.
          */}
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => navigate(home)}
          >
            {isGuest ? t('common:actions.toLanding') : t('common:actions.toCabinet')}
          </button>
        </header>
      )}

      <div className={styles.tabs} role="tablist" aria-label={t('sources:tabs.label')}>
        {TABS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={styles.tab}
            onClick={() => setTab(id)}
          >
            {t(`sources:tabs.${id}`)}
          </button>
        ))}
      </div>

      {tab === 'world' && (
        <section className={styles.body} aria-label={t('sources:tabs.world')}>
          <header className={styles.head}>
            <h1 className={styles.h1}>{t('sources:world.title')}</h1>
            <p className={styles.lead}>{t('sources:world.lead')}</p>
            <span className={styles.count}>{t('sources:world.count', { count: total.sources })}</span>
          </header>

          <div className={styles.filters}>
            <div className={styles.chips} role="group" aria-label={t('sources:filter.topic')}>
              <Chip on={topic === 'all'} onClick={() => setTopic('all')} label={t('sources:filter.all')} />
              {TOPICS.map((id) => (
                <Chip
                  key={id}
                  on={topic === id}
                  onClick={() => setTopic(id)}
                  label={t(`sources:topic.${id}`)}
                />
              ))}
            </div>
            <div className={styles.chips} role="group" aria-label={t('sources:filter.kind')}>
              {KINDS.map((id) => (
                <Chip
                  key={id}
                  on={kind === id}
                  onClick={() => setKind(kind === id ? 'all' : id)}
                  label={t(`sources:kind.${id}`)}
                />
              ))}
            </div>
          </div>

          {shelf.length === 0 ? (
            <p className={styles.empty}>{t('sources:world.nothing')}</p>
          ) : (
            <ul className={styles.cards}>
              {shelf.map((s) => (
                <SourceCard key={s.id} source={s} onSaved={() => void mine.refetch()} />
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'atlas' && (
        <section className={styles.body} aria-label={t('sources:tabs.atlas')}>
          <header className={styles.head}>
            <h1 className={styles.h1}>{t('sources:atlas.title')}</h1>
            <p className={styles.lead}>{t('sources:atlas.lead')}</p>
            <span className={styles.count}>{t('sources:atlas.count', { count: total.orgs })}</span>
          </header>
          {/* Сначала мировые сети, дальше регионы — порядок с листа, а не по алфавиту кода. */}
          {REGIONS.map((region) => {
            const here = SOURCES.filter((s) => s.region === region);
            return (
              <div key={region} className={styles.region}>
                <h2 className={styles.regionTitle}>{t(`sources:region.${region}`)}</h2>
                <ul className={styles.orgs}>
                  {here.map((s) => (
                    <li key={s.id}>
                      <a className={styles.org} href={s.url} target="_blank" rel="noreferrer">
                        <span className={styles.orgName}>{s.org}</span>
                        <span className={styles.orgWhat}>{t(`sources:card.${s.id}.title`)}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>
      )}

      {tab === 'mine' && <MineTab query={mine} />}

      {tab === 'live' && (
        <section className={styles.body} aria-label={t('sources:tabs.live')}>
          <header className={styles.head}>
            <h1 className={styles.h1}>{t('sources:live.title')}</h1>
            <p className={styles.lead}>{t('sources:live.lead')}</p>
          </header>
          <ul className={styles.cards}>
            {SOURCES.filter((s) => s.kind === 'live').map((s) => (
              <SourceCard key={s.id} source={s} onSaved={() => void mine.refetch()} />
            ))}
          </ul>
          {/* Решение владельца ред. 4, п. 1: счётчик зрителей УБРАН — «достоверно чужую
              аудиторию мы не знаем». Ни здесь, ни на карточке его нет и не будет. */}
        </section>
      )}
    </div>
  );
}

/**
 * «Добавленные материалы» — вкладка листа 12, раздел «кабинет».
 *
 * Лист: «до двадцати материалов это простой список; после — каталог собирается сам в этом же
 * окне: поиск и фильтры по намерению, группировка по предметам». Порог оттуда же, не выдуман.
 */
function MineTab({ query }: { query: ReturnType<typeof useMySavedItemsQuery> }) {
  const { t } = useTranslation('sources');
  const [search, setSearch] = useState('');
  const [intent, setIntent] = useState<'all' | 'SAVED' | 'WATCH_LATER'>('all');
  const rows = query.data?.mySavedItems ?? [];
  const catalogue = rows.length > CATALOGUE_FROM;

  const shown = rows.filter((row) => {
    if (intent !== 'all' && row.savedKind !== intent) return false;
    if (!search.trim()) return true;
    const needle = search.trim().toLowerCase();
    return `${row.title} ${row.note ?? ''} ${row.fromLabel ?? ''}`.toLowerCase().includes(needle);
  });

  // Группировка по предмету — то, что лист называет «по предметам». `fromLabel` несёт
  // источник; предмет приезжает пустым у находок вне курса, и они собираются в «найдено в хабе».
  const groups = new Map<string, typeof shown>();
  for (const row of shown) {
    const key = row.fromLabel || t('mine.fromHub');
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  return (
    <section className={styles.body} aria-label={t('tabs.mine')}>
      <header className={styles.head}>
        <h1 className={styles.h1}>{t('mine.title')}</h1>
        <p className={styles.lead}>{t('mine.lead')}</p>
        <span className={styles.count}>{t('mine.count', { count: rows.length })}</span>
      </header>

      {catalogue && (
        <div className={styles.filters}>
          {/* Каталог включается сам, когда материалов стало больше двадцати (лист 12).
              До этого поиск и фильтры по трём строкам — мебель. */}
          <label className={styles.cornerNote}>
            <span>{t('mine.search')}</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <div className={styles.chips} role="group" aria-label={t('mine.intent')}>
            <Chip on={intent === 'all'} onClick={() => setIntent('all')} label={t('filter.all')} />
            <Chip
              on={intent === 'SAVED'}
              onClick={() => setIntent('SAVED')}
              label={t('keep.mine')}
            />
            <Chip
              on={intent === 'WATCH_LATER'}
              onClick={() => setIntent('WATCH_LATER')}
              label={t('keep.later')}
            />
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <p className={styles.empty}>{t('mine.empty')}</p>
      ) : (
        [...groups.entries()].map(([group, items]) => (
          <div key={group} className={styles.region}>
            <h2 className={styles.regionTitle}>{group}</h2>
            <ul className={styles.cards}>
              {items.map((row) => (
                <li key={row.id} className={styles.card}>
                  {row.url ? (
                    <a
                      className={styles.cardTitle}
                      href={row.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {row.title}
                      <span aria-hidden="true"> ↗</span>
                    </a>
                  ) : (
                    <span className={styles.cardTitle}>{row.title}</span>
                  )}
                  {/* Заметка ученика и есть конспект (лист 12). */}
                  {row.note && <p className={styles.cardDesc}>{row.note}</p>}
                  <span className={styles.permission}>
                    {t(`keep.${row.savedKind === 'WATCH_LATER' ? 'later' : 'mine'}`)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}

function Chip({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" className={styles.chip} aria-pressed={on} onClick={onClick}>
      {label}
    </button>
  );
}

function SourceCard({ source, onSaved }: { source: Source; onSaved: () => void }) {
  const { t } = useTranslation('sources');
  const [save, { loading }] = useSaveItemMutation();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [done, setDone] = useState(false);

  const keep = async (kind: 'SAVED' | 'WATCH_LATER') => {
    try {
      await save({
        variables: {
          input: {
            title: t(`card.${source.id}.title`),
            url: source.url,
            sourceName: source.org,
            note,
            kind,
          },
        },
      });
      setDone(true);
      setOpen(false);
      setNote('');
      onSaved();
    } catch {
      // Тихий уголок и отказывает тихо: урок не ломается оттого, что закладка не легла.
      setDone(false);
    }
  };

  return (
    <li className={styles.card}>
      <div className={styles.cardHead}>
        {source.kind === 'live' && (
          <span className={styles.liveTag}>
            {source.schedule ? source.schedule : t('live.now')}
          </span>
        )}
        <span className={styles.org}>{source.org}</span>
      </div>
      <a className={styles.cardTitle} href={source.url} target="_blank" rel="noreferrer">
        {t(`card.${source.id}.title`)}
        <span aria-hidden="true"> ↗</span>
      </a>
      <p className={styles.cardDesc}>{t(`card.${source.id}.desc`)}</p>
      {/* Ученику — прямой ответ, а не код лицензии (решение владельца, ред. 4). Точный код
          видит учитель, и это отдельная работа: пока не показываем НИЧЕГО вместо кода, а не
          показываем неверный код. */}
      <span className={styles.permission} data-kind={source.permission}>
        {t(`permission.${source.permission}`)}
      </span>

      {/* Тихий уголок листа 12 — «^» в правом нижнем углу карточки. */}
      <div className={styles.corner}>
        <button
          type="button"
          className={styles.cornerBtn}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {done ? t('keep.done') : '^'}
        </button>
        {open && (
          <div className={styles.cornerMenu}>
            <label className={styles.cornerNote}>
              <span>{t('keep.note')}</span>
              <input value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            <button type="button" disabled={loading} onClick={() => void keep('SAVED')}>
              {t('keep.mine')}
            </button>
            <button type="button" disabled={loading} onClick={() => void keep('WATCH_LATER')}>
              {t('keep.later')}
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
