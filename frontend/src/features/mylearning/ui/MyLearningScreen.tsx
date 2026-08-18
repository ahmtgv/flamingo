import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import {
  MirrorKind,
  useMirroredFileUrlLazyQuery,
  useMyMirrorQuery,
} from '@/entities/graphql/generated';
import { HOME_ROUTE } from '@/shared/lib/homeRoute';
import { ErrorState } from '@/shared/ui';

import styles from './mylearning.module.css';

/**
 * «МОЯ УЧЁБА» — экран, которого не было под уже данным обещанием (наряд 36 §2).
 *
 * 🔴 ЧТО ЭТО ЧИНИТ. `OWNER_SCOPE §20.5` обещает родителям и ученикам: **учёба принадлежит
 * ученику навсегда, открывается с любого устройства и переживает уход преподавателя.**
 * Зеркало построено, наполняется на каждом событии, покрыто тестами — и `myMirror` числился
 * среди сирот: **ни один экран его не читал.** Обещание существовало только в тестах.
 *
 * ⚠️ СМЫСЛ ЭКРАНА — В ТОМ, ЧТО ОН ОТВЕЧАЕТ ВСЕГДА. Он не спрашивает ни занятие, ни курс, ни
 * преподавателя: `myMirror` берёт всё из зеркала ученика, и машина преподавателя для этого
 * не нужна. Поэтому здесь нет ни одного запроса, который зависел бы от чужого устройства.
 *
 * 🔒 Чужого здесь не бывает: запрос не принимает идентификатора ученика вовсе — сервер отдаёт
 * зеркало того, кто спросил. Попросить чужое нечем.
 */

/** Виды в том порядке, в каком человек о них думает: сначала занятия, потом своё. */
const TABS: { kind: MirrorKind; key: string }[] = [
  { kind: 'DIARY', key: 'diary' },
  { kind: 'WORK', key: 'work' },
  { kind: 'SUMMARY', key: 'summary' },
  { kind: 'BOARD', key: 'board' },
  { kind: 'MATERIAL', key: 'material' },
  { kind: 'SAVED', key: 'saved' },
  { kind: 'CHAT', key: 'chat' },
];

type Payload = Record<string, unknown>;

function text(payload: Payload, key: string): string {
  const value = payload[key];
  return typeof value === 'string' ? value : '';
}

function num(payload: Payload, key: string): number | null {
  const value = payload[key];
  return typeof value === 'number' ? value : null;
}

function list(payload: Payload, key: string): Payload[] {
  const value = payload[key];
  return Array.isArray(value) ? (value as Payload[]) : [];
}

export function MyLearningScreen() {
  const { t } = useTranslation(['mylearning', 'common']);
  const navigate = useNavigate();
  const [kind, setKind] = useState<MirrorKind>('DIARY');
  const { data, loading, error, refetch } = useMyMirrorQuery({
    variables: { kind, limit: 200 },
    fetchPolicy: 'cache-and-network',
  });
  const [openFile] = useMirroredFileUrlLazyQuery();

  const records = useMemo(() => data?.myMirror ?? [], [data]);

  async function open(recordId: string, objectKey: string) {
    // Ссылка подписывается на сервере в момент нажатия: держать её в разметке значило бы
    // раздать всем, кто заглянет в исходник страницы.
    const result = await openFile({ variables: { recordId, objectKey } });
    const url = result.data?.mirroredFileUrl;
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className={styles.page}>
      {/*
        🔴 ЭКРАН БЫЛ ТУПИКОМ (находка ревьюера Р-2, 18.08): ни логотипа, ни чата, ни дороги
        назад — выйти можно было только кнопкой браузера. Экран, из которого нельзя уйти
        средствами продукта, заставляет пользоваться браузером вместо продукта.
      */}
      <nav className={styles.top}>
        <button type="button" className={styles.back} onClick={() => navigate(HOME_ROUTE)}>
          ← {t('common:actions.toCabinet')}
        </button>
      </nav>

      <header className={styles.head}>
        <h1 className={styles.title}>{t('mylearning:title')}</h1>
        <p className={styles.sub}>{t('mylearning:sub')}</p>
      </header>

      <nav className={styles.tabs} aria-label={t('mylearning:tabsLabel')}>
        {TABS.map((tab) => (
          <button
            key={tab.kind}
            type="button"
            className={styles.tab}
            aria-pressed={kind === tab.kind}
            onClick={() => setKind(tab.kind)}
          >
            {t(`mylearning:kind.${tab.key}`)}
          </button>
        ))}
      </nav>

      {error && !data ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : loading && records.length === 0 ? (
        <p className={styles.note}>{t('common:actions.loading')}</p>
      ) : records.length === 0 ? (
        /* Пустое состояние говорит, ЧТО здесь будет, а не молчит (наряд 36 §2). */
        <p className={styles.note}>{t(`mylearning:empty.${kindKey(kind)}`)}</p>
      ) : (
        <ul className={styles.records}>
          {records.map((record) => (
            <li key={record.id} className={styles.record}>
              <Record kind={record.kind} payload={record.payload as Payload} onFile={(key) => void open(record.id, key)} />
              <time className={styles.when} dateTime={record.occurredAt}>
                {new Date(record.occurredAt).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </time>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function kindKey(kind: MirrorKind): string {
  return TABS.find((tab) => tab.kind === kind)?.key ?? 'diary';
}

/**
 * Одна запись зеркала. Вид решает, ЧТО показать: у дневника это занятие и присутствие,
 * у работы — попытка, оценка и слова преподавателя, у доски — сколько на ней фигур.
 *
 * ⚠️ Полей у payload нет в схеме: это JSON, и типизировать его по-настоящему нечем. Поэтому
 * читаем через `text`/`num`/`list`, которые возвращают пустое вместо падения: запись, пришедшая
 * из прошлой версии продукта, не должна ронять человеку весь экран.
 */
function Record({
  kind,
  payload,
  onFile,
}: {
  kind: MirrorKind;
  payload: Payload;
  onFile: (objectKey: string) => void;
}) {
  const { t } = useTranslation('mylearning');

  if (kind === 'DIARY') {
    const attendance = text(payload, 'attendance');
    return (
      <div className={styles.body}>
        <span className={styles.name}>{text(payload, 'lessonTitle') || t('untitled')}</span>
        <span className={styles.meta}>{text(payload, 'courseTitle')}</span>
        <span className={styles.meta}>
          {attendance ? t(`attendance.${attendance.toLowerCase()}`, { defaultValue: attendance }) : ''}
          {payload.closedAutomatically ? ` · ${t('closedAutomatically')}` : ''}
        </span>
      </div>
    );
  }

  if (kind === 'WORK') {
    const score = num(payload, 'score');
    return (
      <div className={styles.body}>
        <span className={styles.name}>{text(payload, 'homeworkTitle') || t('untitled')}</span>
        <span className={styles.meta}>
          {t('attempt', { n: num(payload, 'attempt') ?? 1 })}
          {score !== null ? ` · ${t('score', { n: score })}` : ''}
        </span>
        {text(payload, 'text') && <p className={styles.text}>{text(payload, 'text')}</p>}
        {text(payload, 'comment') && (
          <p className={styles.comment}>{text(payload, 'comment')}</p>
        )}
        {list(payload, 'attachments').length > 0 && (
          <span className={styles.files}>
            {list(payload, 'attachments').map((file) => (
              <button
                key={String(file.objectKey)}
                type="button"
                className={styles.file}
                onClick={() => onFile(String(file.objectKey))}
              >
                {String(file.name ?? file.objectKey)}
              </button>
            ))}
          </span>
        )}
      </div>
    );
  }

  if (kind === 'SUMMARY') {
    const items = list(payload, 'items');
    return (
      <div className={styles.body}>
        <span className={styles.name}>{t('kind.summary')}</span>
        {text(payload, 'intro') && <p className={styles.text}>{text(payload, 'intro')}</p>}
        <span className={styles.meta}>{t('summaryItems', { n: items.length })}</span>
      </div>
    );
  }

  if (kind === 'BOARD') {
    return (
      <div className={styles.body}>
        <span className={styles.name}>{text(payload, 'title') || t('kind.board')}</span>
        <span className={styles.meta}>{t('boardShapes', { n: list(payload, 'elements').length })}</span>
      </div>
    );
  }

  if (kind === 'MATERIAL' || kind === 'SAVED') {
    const url = text(payload, 'url');
    return (
      <div className={styles.body}>
        <span className={styles.name}>{text(payload, 'title') || t('untitled')}</span>
        {text(payload, 'body') && <p className={styles.text}>{text(payload, 'body')}</p>}
        {text(payload, 'note') && <p className={styles.comment}>{text(payload, 'note')}</p>}
        {url && (
          <a className={styles.link} href={url} target="_blank" rel="noreferrer noopener">
            {url}
          </a>
        )}
        {/* Лицензия едет с источником, а не с нами: если она приехала — показываем. */}
        {text(payload, 'attribution') && (
          <span className={styles.credit}>{text(payload, 'attribution')}</span>
        )}
        {text(payload, 'objectKey') && (
          <button
            type="button"
            className={styles.file}
            onClick={() => onFile(text(payload, 'objectKey'))}
          >
            {t('openFile')}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={styles.body}>
      <span className={styles.name}>{text(payload, 'senderName') || t('kind.chat')}</span>
      <p className={styles.text}>{text(payload, 'text')}</p>
    </div>
  );
}
