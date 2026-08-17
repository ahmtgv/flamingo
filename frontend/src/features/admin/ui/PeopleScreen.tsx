import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import {
  type AccountStateValue,
  type OversightPeopleQuery,
  useAccountStateHistoryLazyQuery,
  useOversightPeopleQuery,
  useSetAccountStateMutation,
} from '@/entities/graphql/generated';
import { failureText } from '@/shared/lib/requestFailure';
import { Button, ErrorState, Input } from '@/shared/ui';
import { ICON_SM } from '@/shared/ui/iconSizes';

import { AdminLayout } from './AdminLayout';
import styles from './admin.module.css';

type Person = OversightPeopleQuery['oversightPeople'][number];

// ⚠️ `AccountStateValue` у codegen — ТИП, а не рантайм-перечисление (`enumsAsTypes`).
// Обращение вида `AccountStateValue.Active` компилируется и падает в браузере: модуль такого
// значения не отдаёт. Поэтому сравниваем со строковыми литералами — как весь остальной код
// (`me?.role === 'TEACHER'`). Тип при этом всё равно проверяет каждое из трёх слов.

const STAMP = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * Раздел «Люди» листа D7 — где доступ закрывают и открывают.
 *
 * 🔴 §3-тер, аудит 17.08: **БЛОКИРОВКА БЫЛА ДЕКОРАЦИЕЙ.** Три состояния учётной записи,
 * история переходов, тринадцать зелёных тестов — и ни одной двери: мутации в схеме не было,
 * `set_state` вызывали только тесты, `may_teach` и `may_write_to_shared_chats` не звал никто.
 * Перевод человека в «ограничен» не менял в его дне ничего, а заблокированному вход отвечал
 * «неверная почта или пароль».
 *
 * Экран не добавляет ни одного нового права: он спрашивает то, что сервер и так проверяет
 * (сотрудник платформы, причина обязательна, переход пишется в журнал). Он добавляет
 * **достижимость** — то единственное, чего у механизма не было.
 *
 * ⚠️ Удаления человека и его данных здесь нет и не будет (§20.5): состояние закрывает доступ
 * к платформе и не трогает учёбу. Сняли — человек находит своё ровно там, где оставил.
 */
export function PeopleScreen() {
  const { t } = useTranslation(['admin', 'common']);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const { data, loading, error, refetch } = useOversightPeopleQuery({
    variables: { query, limit: 50 },
  });
  const [setState, { loading: saving }] = useSetAccountStateMutation();
  const [loadHistory, history] = useAccountStateHistoryLazyQuery();
  const [open, setOpen] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [failed, setFailed] = useState<string | null>(null);

  const apply = async (person: Person, state: AccountStateValue) => {
    setFailed(null);
    try {
      await setState({ variables: { userId: person.userId, state, reason } });
      setReason('');
      await refetch();
      if (open === person.userId) await loadHistory({ variables: { userId: person.userId } });
    } catch (err) {
      // Причину отказа говорим словами: сервер отклоняет пустую причину, и человек за
      // панелью должен понять это с первого раза, а не решить, что кнопка сломана.
      setFailed(failureText(err));
    }
  };

  if (error) return <ErrorState text={t('common:failure.unknown')} onRetry={() => void refetch()} />;

  const people = data?.oversightPeople ?? [];

  return (
    <AdminLayout>
      <div className={styles.card}>
        <button type="button" className={styles.back} onClick={() => navigate('/admin')}>
          <ArrowLeft size={ICON_SM} aria-hidden="true" />
          {t('admin:people.back')}
        </button>
        <h1 className={styles.pageTitle}>{t('admin:people.title')}</h1>
        <p className={styles.pageSub}>{t('admin:people.lead')}</p>
      </div>

      <label className={styles.formRow}>
        <span>{t('admin:people.search')}</span>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('admin:people.searchHint')}
        />
      </label>

      {failed && (
        <p className={styles.formError} role="alert">
          {t(failed)}
        </p>
      )}

      {loading && people.length === 0 && <p className={styles.pageSub}>{t('common:actions.loading')}</p>}

      <ul className={styles.people}>
        {people.map((person) => (
          <li key={person.userId} className={styles.person}>
            <div className={styles.personWho}>
              <span className={styles.personName}>{person.fullName}</span>
              <span className={styles.personMeta}>
                {person.email} · {t(`admin:role.${person.role.toUpperCase()}`, { defaultValue: person.role })}
              </span>
            </div>

            <span className={styles.state} data-state={person.state.toLowerCase()}>
              {t(`admin:people.state.${person.state.toLowerCase()}`)}
            </span>

            <div className={styles.personActs}>
              {/* Только те переходы, которые для этого человека что-то меняют: кнопка
                  «Активен» у активного — это кнопка без последствий. */}
              {person.state !== 'ACTIVE' && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={saving}
                  onClick={() => void apply(person, 'ACTIVE')}
                >
                  {t('admin:people.toActive')}
                </Button>
              )}
              {person.state !== 'LIMITED' && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={saving || !reason.trim()}
                  onClick={() => void apply(person, 'LIMITED')}
                >
                  {t('admin:people.toLimited')}
                </Button>
              )}
              {person.state !== 'BLOCKED' && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={saving || !reason.trim()}
                  onClick={() => void apply(person, 'BLOCKED')}
                >
                  {t('admin:people.toBlocked')}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const next = open === person.userId ? null : person.userId;
                  setOpen(next);
                  if (next) void loadHistory({ variables: { userId: person.userId } });
                }}
              >
                {t('admin:people.history')}
              </Button>
            </div>

            {open === person.userId && (
              <ol className={styles.stateLog}>
                {(history.data?.accountStateHistory ?? []).map((row, i) => (
                  <li key={`${row.at}-${i}`}>
                    <span className={styles.logAt}>{STAMP.format(new Date(row.at))}</span>
                    <span>{t(`admin:people.state.${row.state.toLowerCase()}`)}</span>
                    {row.actorName && <span className={styles.personMeta}>{row.actorName}</span>}
                    {row.reason && <span className={styles.personMeta}>{row.reason}</span>}
                  </li>
                ))}
                {(history.data?.accountStateHistory ?? []).length === 0 && (
                  <li className={styles.personMeta}>{t('admin:people.noHistory')}</li>
                )}
              </ol>
            )}
          </li>
        ))}
      </ul>

      {/* Причина — общая на экран, а не у каждой строки: она вводится ровно перед решением,
          и сервер без неё не примет ничего, кроме возврата в «активен». */}
      <label className={styles.formRow}>
        <span>{t('admin:people.reason')}</span>
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t('admin:people.reasonHint')}
        />
      </label>
      <p className={styles.pageSub}>{t('admin:people.reasonWhy')}</p>
    </AdminLayout>
  );
}
