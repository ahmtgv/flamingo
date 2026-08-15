import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  useClaimDeviceTokenMutation,
  useRequestPairingCodeMutation,
} from '@/entities/graphql/generated';

import { PUBLIC_ORIGIN } from '@/shared/lib/env';

import { failureKind, type FailureKind } from '@/shared/lib/requestFailure';

import { APP_VERSION, isDesktop, openExternal } from '../bridge';
import { rememberMachineKey } from '../machineKey';

import { countdown, formatPairingCode } from './firstRun';
import styles from './setup.module.css';

/** Как часто спрашиваем, подтвердили ли код в браузере. */
const POLL_MS = 2000;
/** Адрес страницы подтверждения — тот же, что напечатан на экране. */
// 🔴 T-05: адрес существует (маршрут /link и псевдоним /связать). Печатаем латинский —
// его набирают руками с чужого экрана, и кириллица в адресной строке спотыкается о раскладку.
const SITE = PUBLIC_ORIGIN || 'https://flamingo.plus';
const CONFIRM_URL = `${SITE}/link`;

/**
 * Куда ведут две кнопки шага 1 (OWNER_SCOPE §26.4).
 *
 * Обе несут КОД В АДРЕСЕ: человек нажимает одну кнопку, а не переписывает шесть знаков с
 * экрана приложения в браузер. «Создать учётку» ведёт сразу на форму регистрации преподавателя
 * и просит вернуть человека на подтверждение — `?next=/link?code=…`.
 */
function confirmUrl(code: string | null): string {
  return code ? `${CONFIRM_URL}?code=${encodeURIComponent(code)}` : CONFIRM_URL;
}

function registerUrl(code: string | null): string {
  const back = code ? `/link?code=${encodeURIComponent(code)}` : '/link';
  return `${SITE}/register/teacher?next=${encodeURIComponent(back)}`;
}

/** Что именно не получилось — словами, а не «что-то пошло не так». */
const FAILURE_TEXT: Record<FailureKind, string> = {
  unreachable: 'setup.pairing.failedOffline',
  rejected: 'setup.pairing.failedServer',
  unknown: 'setup.pairing.failedUnknown',
};

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
  // 🔴 Находка владельца 15.08 №1. Экран показывал «Код истёк» тогда, когда код НИКОГДА НЕ
  // ПРИХОДИЛ: `ask()` шёл без перехвата, мутация падала (запрос блокировался CORS и не уходил
  // с машины вовсе), `code` оставался пустым, а отсчёт — нулём, и строка «истёк» рисовалась
  // сама собой. Это худший вид поломки: она мимикрирует под нормальную работу, и человек
  // послушно жмёт «Новый код», пока не сдастся.
  //
  // Состояний теперь ЧЕТЫРЕ и они различимы: просим · ждём подтверждения · истёк · не пришёл
  // и вот почему.
  const [failure, setFailure] = useState<FailureKind | null>(null);
  const [asking, setAsking] = useState(true);
  const [openFailed, setOpenFailed] = useState(false);
  // 🔴 §26.4: код живёт десять минут, а регистрация с подтверждением почты занимает дольше —
  // это обычный первый запуск, а не редкий случай. Приложение берёт новый код САМО и говорит
  // об этом словами; заставлять человека нажимать «Новый код» вслепую нельзя, тем более что
  // тот, который у него уже открыт в браузере, к этому моменту не подойдёт.
  const [renewed, setRenewed] = useState(false);
  const secretRef = useRef<string | null>(null);
  const doneRef = useRef(false);

  const ask = async () => {
    doneRef.current = false;
    setFailure(null);
    setAsking(true);
    try {
      const { data } = await request({
        variables: {
          deviceName: navigator.userAgent.includes('Mac') ? 'Mac' : 'ПК',
          platform: navigator.userAgent.includes('Mac') ? 'MACOS' : 'OTHER',
          appVersion: APP_VERSION,
        },
      });
      const req = data?.requestPairingCode;
      if (!req) {
        setFailure('unknown');
        return;
      }
      secretRef.current = req.secret;
      setCode(req.code);
      setExpiresAt(new Date(req.expiresAt).getTime());
    } catch (error) {
      // «Сервера нет» и «сервер отказал» — разные вещи для того, кто это читает: в первом
      // случае чинить связь, во втором звать нас.
      setFailure(failureKind(error));
      setCode(null);
      setExpiresAt(null);
    } finally {
      setAsking(false);
    }
  };

  /** Открыть адрес снаружи — и сказать, если не вышло. */
  const openOutside = async (url: string) => {
    setOpenFailed(false);
    if (isDesktop()) {
      const opened = await openExternal(url);
      if (!opened) setOpenFailed(true);
      return;
    }
    window.open(url, '_blank', 'noreferrer,noopener');
  };

  const openPage = () => openOutside(confirmUrl(code));
  const openRegistration = () => openOutside(registerUrl(code));

  useEffect(() => {
    void ask();
    // The code is asked for once per mounting of this step; `ask` is re-created each render
    // and listing it here would request a new code on every tick of the countdown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Обратный отсчёт — «осталось 9:41». Считается от expiresAt, поэтому переживает и то, что
  // ноутбук закрыли на минуту: вернётся правильное число, а не то, на котором остановились.
  //
  // По исчерпании — сразу просим новый, не дожидаясь нажатия: человек в этот момент читает
  // письмо с подтверждением почты, а не смотрит на наш отсчёт.
  useEffect(() => {
    if (expiresAt === null) return;
    const tick = () => {
      const left = Math.max(0, expiresAt - Date.now());
      setMsLeft(left);
      if (left === 0 && !doneRef.current) {
        setRenewed(true);
        void ask();
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
    // `ask` пересоздаётся каждый рендер; в зависимостях он перезапускал бы таймер ежесекундно.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // 🔴 Два столбца, а не длинный свиток (находка владельца 15.08 №5). Слева то, что ДЕЛАЮТ:
    // код и две кнопки. Справа то, что читают: зачем это, что даёт вход, запасной путь.
    // Шаг обязан умещаться в окно целиком — у окна известный размер, и прокрутка здесь
    // означала бы, что код уехал за край ровно в тот момент, когда его диктуют.
    <div className={styles.stepCols}>
      <div className={styles.col}>
        <h2 className={styles.h}>{t('setup.pairing.title')}</h2>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.cardTitle}>{t('setup.pairing.cardTitle')}</span>
          <span className={styles.tag}>{t('setup.pairing.cardTag')}</span>
        </div>
        <p className={styles.p}>{t('setup.pairing.instruction')}</p>

        <output className={styles.code} aria-live="polite">
          {code ? formatPairingCode(code) : '· · ·'}
        </output>

        {/* 🔴 Заглушка, выдающая себя за истёкший код, недопустима: «истёк» говорится только
            про код, который БЫЛ. Нет кода — сказано, что именно не получилось. */}
        {/* Код обновился сам — сказать об этом, иначе человек введёт в браузере старый. */}
        {renewed && !failure && (
          <p className={styles.warn} role="status">
            {t('setup.pairing.renewed')}
          </p>
        )}

        <p className={styles.waiting} data-failed={failure ? 'true' : undefined}>
          {failure
            ? `${t('setup.pairing.failedTitle')} · ${t(FAILURE_TEXT[failure])}`
            : asking
              ? t('setup.pairing.asking')
              : msLeft > 0
                ? t('setup.pairing.waiting', { left: countdown(msLeft) })
                : t('setup.pairing.expired')}
        </p>

        <div className={styles.row}>
          {/* Внутри приложения обычная ссылка не открывает ничего — webview не заводит окон
              (находка №2). Открываем внешним браузером через оболочку; в вебе — как было. */}
          <button type="button" className={styles.btn} onClick={() => void openPage()}>
            {t('setup.pairing.open')}
          </button>
          {/* 🔴 §26.4: у того, у кого учётки нет, шаг 1 был тупиком — про регистрацию говорила
              строчка мелким шрифтом внизу, и её не замечали. Теперь это кнопка рядом с первой,
              ведущая сразу на форму регистрации, с кодом в адресе и с возвратом на
              подтверждение: переписывать шесть знаков не придётся. */}
          <button
            type="button"
            className={styles.btnGhost}
            onClick={() => void openRegistration()}
          >
            {t('setup.pairing.createAccount')}
          </button>
          <button
            type="button"
            className={styles.btnGhost}
            disabled={asking}
            onClick={() => void ask()}
          >
            {t('setup.pairing.again')}
          </button>
        </div>
        {openFailed && (
          <p className={styles.warn} role="alert">
            {t('setup.pairing.openFailed', { url: confirmUrl(code) })}
          </p>
        )}
      </div>
      </div>

      <div className={styles.col}>
        <p className={styles.p}>{t('setup.pairing.body')}</p>
        <p className={styles.pStrong}>{t('setup.pairing.noPassword')}</p>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.cardTitle}>{t('setup.pairing.whatItMeans')}</span>
          <span className={styles.tag}>{t('setup.pairing.important')}</span>
        </div>
        {/* Видны те два факта, которые МЕНЯЮТ ПОВЕДЕНИЕ: машина становится ведущей и её
            надо включать. Остальные два — «когда-нибудь вторая машина» и «ключ лежит в
            связке» — справка; она под раскрытием, а не под прокруткой (требование владельца
            15.08 №5: сворачивать справочный текст, а не отдавать его скроллу). */}
        <ul className={styles.facts}>
          <li>{t('setup.pairing.hostFact')}</li>
          <li>{t('setup.pairing.visibleFact')}</li>
        </ul>
        {/* Всё, что не «сделай сейчас», — под одним раскрытием. Не спрятано: раскрытие видно,
            подписано и открывается одним нажатием; спрятанное — это то, что уехало под
            прокрутку и о чём человек не знает. */}
        <details className={styles.more}>
          <summary>{t('setup.pairing.moreFacts')}</summary>
          <ul className={styles.facts}>
            <li className={styles.later}>{t('setup.pairing.secondMachine')}</li>
            <li>{t('setup.pairing.keychain')}</li>
          </ul>
          <p className={styles.note}>{t('setup.pairing.noAccount')}</p>
          {/* Запасной путь — это ВЕБ-вход, а не форма здесь. §19.4: пароль не пересекает
              границу приложения ни разу. */}
          <p className={styles.note}>
            <button type="button" className={styles.link} onClick={() => void openPage()}>
              {t('setup.pairing.fallback')}
            </button>{' '}
            — {t('setup.pairing.fallbackHint')}
          </p>
        </details>
      </div>
      </div>
    </div>
  );
}
