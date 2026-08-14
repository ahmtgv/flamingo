import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useConfirmPairingCodeMutation } from '@/entities/graphql/generated';
import { failureKind } from '@/shared/lib/requestFailure';
import { Button, Card, TextField } from '@/shared/ui';

import styles from './linkMachine.module.css';

/**
 * Страница подтверждения машины — та самая `/связать` (🔴 T-05, аудит 14.08).
 *
 * Приложение печатало «откройте flamingo.plus/связать», **а такого маршрута не было**: человек
 * молча оказывался на главной, и связывание — первый шаг первого запуска — не завершалось
 * вообще ничем. Выбор был между честным текстом без адреса и настоящим маршрутом; маршрут
 * дешевле и закрывает дыру, а не описывает её.
 *
 * 🔒 Пароля здесь нет и не будет (OWNER_SCOPE §19.4). Человек уже вошёл в браузере обычным
 * способом — на странице с адресной строкой и замком; здесь он только подтверждает, что шесть
 * знаков на экране приложения показывает его собственная машина.
 */
export function LinkMachineScreen() {
  const { t } = useTranslation('desktop');
  const [code, setCode] = useState('');
  const [confirm, { loading }] = useConfirmPairingCodeMutation();
  const [linked, setLinked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    // Код читают с чужого экрана и набирают руками: пробелы, точки-разделители и нижний
    // регистр — это норма ввода, а не ошибка человека.
    const clean = code.replace(/[^0-9a-zа-я]/gi, '').toUpperCase();
    if (clean.length !== 6) {
      setError(t('linkMachine.badCode'));
      return;
    }
    try {
      const { data } = await confirm({ variables: { code: clean } });
      setLinked(data?.confirmPairingCode?.name ?? '');
    } catch (err) {
      setError(failureKind(err) === 'unreachable' ? t('linkMachine.unreachable') : t('linkMachine.refused'));
    }
  }

  if (linked !== null) {
    return (
      <div className={styles.page}>
        <Card className={styles.card}>
          <h1 className={styles.h}>{t('linkMachine.doneTitle')}</h1>
          <p className={styles.p}>{t('linkMachine.doneBody', { name: linked })}</p>
          <p className={styles.note}>{t('linkMachine.doneHint')}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <h1 className={styles.h}>{t('linkMachine.title')}</h1>
        <p className={styles.p}>{t('linkMachine.body')}</p>
        <form noValidate onSubmit={handleSubmit}>
          <TextField
            label={t('linkMachine.field')}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            error={error ?? undefined}
            placeholder="K7M 4Q2"
            autoComplete="off"
            inputMode="text"
          />
          <Button type="submit" variant="primary" block loading={loading} className={styles.submit}>
            {t('linkMachine.submit')}
          </Button>
        </form>
        {/* 🔒 Пароль тут не спрашивают — и это сказано вслух, чтобы человек не искал поле. */}
        <p className={styles.note}>{t('linkMachine.noPassword')}</p>
      </Card>
    </div>
  );
}
