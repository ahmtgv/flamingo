import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  useClaimDeviceTokenMutation,
  useRequestPairingCodeMutation,
} from '@/entities/graphql/generated';

import { rememberMachineKey } from '../machineKey';

import { countdown, formatPairingCode } from './firstRun';
import styles from './setup.module.css';

/** Как часто спрашиваем, подтвердили ли код в браузере. */
const POLL_MS = 2000;
/** Адрес страницы подтверждения — тот же, что напечатан на экране. */
const CONFIRM_URL = 'https://flamingo.plus/связать';

/**
 * Шаг 1 — связывание машины кодом (atlas D2, OWNER_SCOPE §19.4).
 *
 * 🔒 **Пароль здесь не спрашивают, и поля для него нет.** The app shows six characters; the
 * teacher opens the site in a real browser — where the address bar and the padlock are
 * visible — signs in as usual, and types them in. Three reasons, all the owner's:
 *
 * 1. registration, e-mail confirmation and password recovery already live in the web and must
 *    work from any device; a second copy of those forms is two implementations of the most
 *    legally sensitive part of the product, and one day they diverge;
 * 2. the installer is unsigned (§19.2), so the system has just called us «неизвестный
 *    разработчик» — asking for an account password at that exact moment is the worst thing
 *    imaginable for trust;
 * 3. a stolen laptop does not give up a password: this machine's access is revoked from the
 *    cabinet with one button.
 *
 * The fallback «войти по почте и паролю» is a link to the same web login, not a form here.
 */
export function PairingStep({ onPaired }: { onPaired: () => void }) {
  const { t } = useTranslation('desktop');
  const [request] = useRequestPairingCodeMutation();
  const [claim] = useClaimDeviceTokenMutation();

  const [code, setCode] = useState<string | null>(null);
  // Абсолютный момент истечения, а не убывающий счётчик: таймер, зависящий от собственного
  // значения, перезапускается каждую секунду и однажды запрашивает новый код.
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [msLeft, setMsLeft] = useState(0);
  const secretRef = useRef<string | null>(null);
  const doneRef = useRef(false);

  const ask = async () => {
    doneRef.current = false;
    const { data } = await request({
      variables: {
        deviceName: navigator.userAgent.includes('Mac') ? 'Mac' : 'ПК',
        platform: navigator.userAgent.includes('Mac') ? 'MACOS' : 'OTHER',
        appVersion: '0.1.0',
      },
    });
    const req = data?.requestPairingCode;
    if (!req) return;
    secretRef.current = req.secret;
    setCode(req.code);
    setExpiresAt(new Date(req.expiresAt).getTime());
  };

  useEffect(() => {
    void ask();
    // The code is asked for once per mounting of this step; `ask` is re-created each render
    // and listing it here would request a new code on every tick of the countdown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Обратный отсчёт — «осталось 9:41». Считается от expiresAt, поэтому переживает и то, что
  // ноутбук закрыли на минуту: вернётся правильное число, а не то, на котором остановились.
  useEffect(() => {
    if (expiresAt === null) return;
    const tick = () => setMsLeft(Math.max(0, expiresAt - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  // Опрос: подтвердили ли в браузере. Claim отдаёт ключ ровно один раз.
  useEffect(() => {
    if (!code || expiresAt === null) return;
    const id = window.setInterval(async () => {
      if (doneRef.current || !secretRef.current) return;
      if (Date.now() >= expiresAt) return window.clearInterval(id);
      try {
        const { data } = await claim({ variables: { code, secret: secretRef.current } });
        const token = data?.claimDeviceToken?.token;
        if (!token) return;
        doneRef.current = true;
        window.clearInterval(id);
        // 🔒 Straight into the OS keychain — never a config file, never localStorage
        // (PROMPT_14 §2.2.2). `rememberMachineKey` is the only thing that ever holds it.
        await rememberMachineKey(token);
        onPaired();
      } catch {
        // Not confirmed yet is the ordinary case, and it arrives as an error. Waiting is not
        // a failure worth showing anyone — the countdown already says what is happening.
      }
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [code, expiresAt, claim, onPaired]);

  return (
    <div className={styles.step}>
      <h2 className={styles.h}>{t('setup.pairing.title')}</h2>
      <p className={styles.p}>{t('setup.pairing.body')}</p>
      <p className={styles.pStrong}>{t('setup.pairing.noPassword')}</p>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.cardTitle}>{t('setup.pairing.cardTitle')}</span>
          <span className={styles.tag}>{t('setup.pairing.cardTag')}</span>
        </div>
        <p className={styles.p}>{t('setup.pairing.instruction')}</p>

        <output className={styles.code} aria-live="polite">
          {code ? formatPairingCode(code) : '· · ·'}
        </output>

        <p className={styles.waiting}>
          {msLeft > 0
            ? t('setup.pairing.waiting', { left: countdown(msLeft) })
            : t('setup.pairing.expired')}
        </p>

        <div className={styles.row}>
          <a className={styles.btn} href={CONFIRM_URL} target="_blank" rel="noreferrer noopener">
            {t('setup.pairing.open')}
          </a>
          <button type="button" className={styles.btnGhost} onClick={() => void ask()}>
            {t('setup.pairing.again')}
          </button>
        </div>
        <p className={styles.note}>{t('setup.pairing.noAccount')}</p>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.cardTitle}>{t('setup.pairing.whatItMeans')}</span>
          <span className={styles.tag}>{t('setup.pairing.important')}</span>
        </div>
        <ul className={styles.facts}>
          <li>{t('setup.pairing.hostFact')}</li>
          <li>{t('setup.pairing.visibleFact')}</li>
          <li className={styles.later}>{t('setup.pairing.secondMachine')}</li>
          <li>{t('setup.pairing.keychain')}</li>
        </ul>
      </div>

      {/* Запасной путь — это ВЕБ-вход, а не форма здесь. §19.4: пароль не пересекает границу
          приложения ни разу. */}
      <p className={styles.note}>
        <a className={styles.link} href={CONFIRM_URL} target="_blank" rel="noreferrer noopener">
          {t('setup.pairing.fallback')}
        </a>{' '}
        — {t('setup.pairing.fallbackHint')}
      </p>
    </div>
  );
}
