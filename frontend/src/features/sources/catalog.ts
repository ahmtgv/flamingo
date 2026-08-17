/**
 * Что открыл мир — лист атласа 12.
 *
 * 🔴 Владелец 17.08: «При переходе в „Источники Мира" получаем кабинет преподавателя, курсы».
 * Так и было: три кнопки на двух новых экранах (`StartScreen` шапка и быстрый вход,
 * `SubjectScreen` рельс и «все →») обещали хаб источников и открывали архивный каталог курсов.
 * Лист 12 утверждён 12.08 и не имел НИ ОДНОГО маршрута — из девяти листов-контрактов не начаты
 * были три, и этот заметнее всех, потому что на него ведут четыре кнопки.
 *
 * Почему список лежит здесь, а не в базе. Это редакционный перечень институций, одинаковый для
 * всех: он не зависит ни от пользователя, ни от учреждения, ни от времени. Заводить под него
 * таблицу — значит заводить и её редактирование, и права на него, и миграции, ради данных,
 * которые меняются раз в квартал правкой файла. Когда появится подбор под урок (лист 12,
 * «К твоим урокам»), у него будет свой источник — серверный, потому что он уже про человека.
 *
 * ⚠️ Тексты здесь НЕ ХРАНЯТСЯ. В записи — только идентификатор, имя институции (имя собственное
 * не переводится) и адрес. Название источника и описание живут в `i18n/locales/ru/sources.json`
 * под ключом `card.<id>.title` / `.desc` — иначе первый же второй язык упрётся в этот файл.
 */

/** Что с этим можно делать — ученику словами, а не кодом лицензии (решение владельца, ред. 4). */
export type Permission = 'reuse' | 'watch' | 'yours';

/** Полки хаба. `live` — то, что идёт прямо сейчас; остальное — по роду источника. */
export type Kind = 'live' | 'data' | 'collection' | 'instrument';

export type Topic = 'astronomy' | 'books' | 'museums' | 'nature' | 'earth';

export interface Source {
  id: string;
  /** Имя институции. Имя собственное — не переводится и не выдумывается. */
  org: string;
  url: string;
  kind: Kind;
  topic: Topic;
  permission: Permission;
  /** Регион для вкладки «Атлас источников». `world` — мировые сети, они идут первыми. */
  region: 'world' | 'europe' | 'russia' | 'america';
  /** Для «Сейчас в эфире»: постоянная трансляция или по расписанию (время — как есть). */
  schedule?: string;
}

export const SOURCES: readonly Source[] = [
  // --- мировые сети ---------------------------------------------------------------
  { id: 'gbif', org: 'GBIF', url: 'https://www.gbif.org/', kind: 'data', topic: 'nature', permission: 'reuse', region: 'world' },
  { id: 'inaturalist', org: 'iNaturalist', url: 'https://www.inaturalist.org/', kind: 'data', topic: 'nature', permission: 'reuse', region: 'world' },
  { id: 'ebird', org: 'eBird', url: 'https://ebird.org/', kind: 'data', topic: 'nature', permission: 'reuse', region: 'world' },
  { id: 'wikisource', org: 'Wikisource', url: 'https://wikisource.org/', kind: 'collection', topic: 'books', permission: 'reuse', region: 'world' },
  { id: 'archive', org: 'Internet Archive', url: 'https://archive.org/', kind: 'collection', topic: 'books', permission: 'reuse', region: 'world' },
  { id: 'openlibrary', org: 'Internet Archive', url: 'https://openlibrary.org/', kind: 'collection', topic: 'books', permission: 'reuse', region: 'world' },
  { id: 'lco', org: 'Las Cumbres Observatory', url: 'https://lco.global/', kind: 'instrument', topic: 'astronomy', permission: 'yours', region: 'world' },

  // --- Европа ---------------------------------------------------------------------
  { id: 'esa-webtv', org: 'ESA', url: 'https://www.esa.int/ESA_Multimedia/ESA_Web_TV', kind: 'live', topic: 'astronomy', permission: 'watch', region: 'europe' },
  { id: 'esa-sky', org: 'ESA', url: 'https://sky.esa.int/', kind: 'data', topic: 'astronomy', permission: 'reuse', region: 'europe' },
  { id: 'eso', org: 'ESO', url: 'https://www.eso.org/public/images/', kind: 'collection', topic: 'astronomy', permission: 'reuse', region: 'europe' },
  { id: 'europeana', org: 'Europeana', url: 'https://www.europeana.eu/', kind: 'collection', topic: 'museums', permission: 'reuse', region: 'europe' },
  { id: 'rijksmuseum', org: 'Rijksmuseum', url: 'https://www.rijksmuseum.nl/en/rijksstudio', kind: 'collection', topic: 'museums', permission: 'reuse', region: 'europe' },
  { id: 'simbad', org: 'CDS Strasbourg', url: 'https://simbad.cds.unistra.fr/simbad/', kind: 'data', topic: 'astronomy', permission: 'reuse', region: 'europe' },
  { id: 'copernicus', org: 'Copernicus', url: 'https://dataspace.copernicus.eu/', kind: 'data', topic: 'earth', permission: 'reuse', region: 'europe' },
  { id: 'british-museum', org: 'British Museum', url: 'https://www.britishmuseum.org/collection', kind: 'collection', topic: 'museums', permission: 'watch', region: 'europe' },
  { id: 'greenwich', org: 'Royal Observatory Greenwich', url: 'https://www.rmg.co.uk/royal-observatory', kind: 'live', topic: 'astronomy', permission: 'watch', region: 'europe', schedule: '18:00' },

  // --- Россия ---------------------------------------------------------------------
  { id: 'nel', org: 'НЭБ', url: 'https://rusneb.ru/', kind: 'collection', topic: 'books', permission: 'reuse', region: 'russia' },
  { id: 'prlib', org: 'Президентская библиотека', url: 'https://www.prlib.ru/', kind: 'collection', topic: 'books', permission: 'reuse', region: 'russia' },
  { id: 'pushkin', org: 'ГМИИ им. А. С. Пушкина', url: 'https://pushkinmuseum.art/', kind: 'collection', topic: 'museums', permission: 'watch', region: 'russia' },
  { id: 'hermitage', org: 'Эрмитаж', url: 'https://www.hermitagemuseum.org/', kind: 'collection', topic: 'museums', permission: 'watch', region: 'russia' },
  { id: 'runivers', org: 'Руниверс', url: 'https://runivers.ru/', kind: 'collection', topic: 'books', permission: 'reuse', region: 'russia' },

  // --- Северная Америка -----------------------------------------------------------
  { id: 'nasa-live', org: 'NASA', url: 'https://www.nasa.gov/nasatv/', kind: 'live', topic: 'astronomy', permission: 'watch', region: 'america' },
  { id: 'exoplanet-archive', org: 'NASA', url: 'https://exoplanetarchive.ipac.caltech.edu/', kind: 'data', topic: 'astronomy', permission: 'reuse', region: 'america' },
  { id: 'loc', org: 'Library of Congress', url: 'https://www.loc.gov/collections/', kind: 'collection', topic: 'books', permission: 'reuse', region: 'america' },
  { id: 'smithsonian-zoo', org: 'Smithsonian', url: 'https://nationalzoo.si.edu/webcams', kind: 'live', topic: 'nature', permission: 'watch', region: 'america' },
  { id: 'smithsonian-open', org: 'Smithsonian', url: 'https://www.si.edu/openaccess', kind: 'collection', topic: 'museums', permission: 'reuse', region: 'america' },
  { id: 'met', org: 'The Metropolitan Museum of Art', url: 'https://www.metmuseum.org/art/collection', kind: 'collection', topic: 'museums', permission: 'reuse', region: 'america' },
  { id: 'microobservatory', org: 'Harvard & Smithsonian', url: 'https://mo-www.cfa.harvard.edu/OWN/', kind: 'instrument', topic: 'astronomy', permission: 'yours', region: 'america' },
  { id: 'mast', org: 'STScI · MAST', url: 'https://mast.stsci.edu/', kind: 'data', topic: 'astronomy', permission: 'reuse', region: 'america' },
  { id: 'dpla', org: 'DPLA', url: 'https://dp.la/', kind: 'collection', topic: 'books', permission: 'reuse', region: 'america' },
  { id: 'usgs', org: 'USGS', url: 'https://earthquake.usgs.gov/earthquakes/map/', kind: 'data', topic: 'earth', permission: 'reuse', region: 'america' },
  { id: 'noaa', org: 'NOAA', url: 'https://www.noaa.gov/', kind: 'data', topic: 'earth', permission: 'reuse', region: 'america' },
  { id: 'gutenberg', org: 'Project Gutenberg', url: 'https://www.gutenberg.org/', kind: 'collection', topic: 'books', permission: 'reuse', region: 'america' },
  { id: 'commonvoice', org: 'Mozilla', url: 'https://commonvoice.mozilla.org/', kind: 'data', topic: 'books', permission: 'reuse', region: 'america' },
  { id: 'explore-bears', org: 'Explore.org', url: 'https://explore.org/livecams/brown-bears/brown-bear-salmon-cam-brooks-falls', kind: 'live', topic: 'nature', permission: 'watch', region: 'america' },
  { id: 'explore-savanna', org: 'Explore.org', url: 'https://explore.org/livecams/african-wildlife/african-watering-hole-animal-camera', kind: 'live', topic: 'nature', permission: 'watch', region: 'america' },
];

export const TOPICS: readonly Topic[] = ['astronomy', 'books', 'museums', 'nature', 'earth'];
export const KINDS: readonly Kind[] = ['live', 'data', 'collection', 'instrument'];
export const REGIONS = ['world', 'europe', 'russia', 'america'] as const;

/** Сколько источников и институций — числа на листе живые, а не написанные от руки. */
export function counts() {
  return {
    sources: SOURCES.length,
    orgs: new Set(SOURCES.map((s) => s.org)).size,
    live: SOURCES.filter((s) => s.kind === 'live').length,
  };
}
