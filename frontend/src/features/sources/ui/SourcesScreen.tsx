import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { isDesktop } from '@/features/desktop/bridge';
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

type Tab = 'world' | 'atlas' | 'live';
const TABS: readonly Tab[] = ['world', 'atlas', 'live'];

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
 * ⚠️ Чего здесь ПОКА НЕТ, и это сказано вслух, а не заметено: «+ в мои материалы» (уголок «^»
 * на карточке) и «Добавленные материалы» в кабинете. Это решение владельца ред. 4 и оно будет
 * исполнено, но за ним стоит новая хранимая сущность — а её заводят по §2.2 отдельно, вместе с
 * правами и миграцией, а не попутно. Мёртвого уголка на карточке нет: кнопка, которая ничего
 * не делает, хуже отсутствующей.
 */
export function SourcesScreen() {
  const { t } = useTranslation(['sources', 'common']);
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('world');
  const [topic, setTopic] = useState<Topic | 'all'>('all');
  const [kind, setKind] = useState<Kind | 'all'>('all');

  const total = useMemo(counts, []);

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
            onClick={() => navigate('/start')}
            aria-label="Flamingo"
          >
            <Logo />
          </button>
          <span className={styles.hubMark}>HUB</span>
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
                <SourceCard key={s.id} source={s} />
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

      {tab === 'live' && (
        <section className={styles.body} aria-label={t('sources:tabs.live')}>
          <header className={styles.head}>
            <h1 className={styles.h1}>{t('sources:live.title')}</h1>
            <p className={styles.lead}>{t('sources:live.lead')}</p>
          </header>
          <ul className={styles.cards}>
            {SOURCES.filter((s) => s.kind === 'live').map((s) => (
              <SourceCard key={s.id} source={s} />
            ))}
          </ul>
          {/* Решение владельца ред. 4, п. 1: счётчик зрителей УБРАН — «достоверно чужую
              аудиторию мы не знаем». Ни здесь, ни на карточке его нет и не будет. */}
        </section>
      )}
    </div>
  );
}

function Chip({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" className={styles.chip} aria-pressed={on} onClick={onClick}>
      {label}
    </button>
  );
}

function SourceCard({ source }: { source: Source }) {
  const { t } = useTranslation('sources');
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
    </li>
  );
}
