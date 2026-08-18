import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { SOURCES } from '@/features/sources/catalog';
import { Logo } from '@/shared/ui';

import styles from './landing.module.css';

/**
 * ПЕРВАЯ СТРАНИЦА — лист `docs/design-previews/atlas/L2_landing_structured.html`, вариант 1
 * (мозаика; решение владельца §34.5, спор закрыт в §34.7).
 *
 * 🔴 ЧТО ЭТО ЧИНИТ. Корень сайта отправлял гостя на форму входа: для постороннего человека
 * flamingo.plus выглядел как окно логина. Теперь корень показывает страницу, а вход и
 * регистрация стоят в верхней строке — как на листе.
 *
 * ⚠️ СТРАНИЦА НЕ ПРОКРУЧИВАЕТСЯ. Это требование листа, а не приём вёрстки: афиша должна быть
 * видна с одного взгляда, рост уходит за «все →».
 *
 * 🔴 ЧЕМ НАПОЛНЕНА — И ПОЧЕМУ НЕ ВСЕМ (наряд 35 §3.2, права проверены ревьюером 18.08).
 *
 * Плитки здесь **текстовые**: имя институции и ссылка. Это сделано намеренно и снимает
 * лицензионный вопрос целиком — назвать музей и дать на него ссылку можно всегда, а вот
 * показать его картинку — уже использование материала, и на него нужно право.
 *
 * Поимённо:
 *   * **NASA** — можно сегодня: материалы не защищены авторским правом в США. Два условия
 *     выполнены — источник назван, эмблема и логотип НЕ используются (они как раз защищены).
 *   * **Эрмитаж** — условий в открытом виде нет, нужен запрос музею. На афише НЕТ.
 *   * **Cambridge Digital Library** — общие условия разрешают некоммерческое использование,
 *     а мы коммерческие; годится только то, у чего своя лицензия. На афише НЕТ.
 *   * **Национальный архив** — владелец не назвал, какой именно. На афише НЕТ.
 *
 * Заглушек «пока так» здесь нет и быть не должно: заглушка на первой странице живёт вечно.
 */
export function LandingScreen() {
  const { t } = useTranslation('landing');
  // Виды и темы источников берём словами самого продукта — хаб источников говорит так же.
  const { t: tSources } = useTranslation('sources');

  /**
   * Счётчик берётся из НАСТОЯЩЕГО каталога источников, а не пишется рукой: цифра на афише,
   * разошедшаяся с хабом, — это ровно то враньё, которое замечают первым.
   */
  const openSources = useMemo(() => SOURCES.filter((s) => s.permission === 'reuse'), []);

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <Link to="/" className={styles.brand} aria-label="Flamingo">
          <Logo />
        </Link>
        <nav className={styles.nav}>
          <Link to="/sources">{t('nav.sources')}</Link>
          <Link to="/courses">{t('nav.subjects')}</Link>
        </nav>
        <div className={styles.enter}>
          <Link to="/login" className={styles.linkBtn}>
            {t('enter.signIn')}
          </Link>
          <Link to="/register" className={styles.primaryBtn}>
            {t('enter.register')}
          </Link>
        </div>
      </header>

      <main className={styles.mosaic}>
        {/*
          Тезисы — текст ревьюера (наряд 36 §1), аудитория по §34.10: старшеклассник, студент,
          взрослый, выбирающий СЕБЕ. Поэтому разговор о нём, а не о классе и не о родителе.

          ⚠️ Слова «класс» здесь НЕТ намеренно: взрослого оно возвращает за парту, а он пришёл
          не за этим. Не возвращать — это указание, а не стилистика.
        */}
        <section className={styles.claim} aria-labelledby="claim-title">
          <p className={styles.kicker}>{t('claim.kicker')}</p>
          <h1 id="claim-title" className={styles.title}>
            {t('claim.title')}
          </h1>
          <ol className={styles.theses}>
            {['live', 'attention', 'sources', 'yours'].map((key, i) => (
              <li key={key}>
                <span className={styles.thesisNo} aria-hidden="true">
                  {i + 1}
                </span>
                <span>
                  <b>{t(`claim.theses.${key}.head`)}</b> {t(`claim.theses.${key}.body`)}
                </span>
              </li>
            ))}
          </ol>
          <p className={styles.actions}>
            <Link to="/demo" className={styles.primaryBtn}>
              {t('actions.watch')}
            </Link>
            <Link to="/courses" className={styles.linkBtn}>
              {t('actions.subjects')}
            </Link>
          </p>
        </section>

        <section className={styles.sources} aria-labelledby="sources-title">
          <p className={styles.sectionHead}>
            <span id="sources-title" className={styles.sectionName}>
              {t('sources.title')}
            </span>
            <span className={styles.count}>{t('sources.count', { n: openSources.length })}</span>
            <Link to="/sources" className={styles.all}>
              {t('all')}
            </Link>
          </p>
          <ul className={styles.tiles}>
            {/*
              🔴 ПОЧЕМУ ИМЕННО ЭТИ И ПОЧЕМУ ТОЛЬКО ТЕКСТ.
              Отбор структурный, а не на глаз: `permission === 'reuse'` — то есть открытая
              лицензия. Эрмитаж в каталоге помечен `watch` и потому сюда физически не попадёт,
              пока музей не ответит; Кембриджа и Национального архива в каталоге нет вовсе.
              Плитка несёт ИМЯ и ССЫЛКУ, без картинок и без эмблем: назвать институцию и дать
              на неё ссылку можно всегда, а показать её материал — уже нужно право.
            */}
            <li className={styles.tile}>
              <a href="https://www.nasa.gov/nasatv/" target="_blank" rel="noreferrer noopener">
                <span className={styles.tileKind}>{t('sources.nasa.kind')}</span>
                <span className={styles.tileOrg}>NASA</span>
                <span className={styles.tileLine}>{t('sources.nasa.line')}</span>
                {/* Условие использования выполнено: источник назван. Эмблему NASA не берём. */}
                <span className={styles.credit}>{t('sources.nasa.credit')}</span>
              </a>
            </li>
            {openSources.slice(0, 3).map((source) => (
              <li key={source.id} className={styles.tile}>
                <a href={source.url} target="_blank" rel="noreferrer noopener">
                  <span className={styles.tileKind}>{tSources(`kind.${source.kind}`)}</span>
                  <span className={styles.tileOrg}>{source.org}</span>
                  <span className={styles.tileLine}>{tSources(`topic.${source.topic}`)}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.shorts} aria-labelledby="shorts-title">
          <p className={styles.sectionHead}>
            <span id="shorts-title" className={styles.sectionName}>
              {t('shorts.title')}
            </span>
          </p>
          {/* Ни одного шортса ещё не снято. Пустая полка честнее выдуманной. */}
          <p className={styles.empty}>{t('shorts.empty')}</p>
        </section>
      </main>
    </div>
  );
}
