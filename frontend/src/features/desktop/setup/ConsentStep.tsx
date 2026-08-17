import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  useSetAttentionConsentMutation,
  useSetSpeechConsentMutation,
} from '@/entities/graphql/generated';

import { stepFailureKey } from './stepFailure';
import styles from './setup.module.css';

interface ConsentStepProps {
  onNext: () => void;
  /** Когда подписано согласие 152-ФЗ — при регистрации. Пусто у старых учёток. */
  consent152fzAt?: string | null;
}

const SIGNED_ON = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/**
 * Шаг 3 — что уходит и что не уходит никогда (atlas D2, OWNER_SCOPE §19).
 *
 * The order of the two blocks on this screen is the design, and it is not negotiable: the
 * list of what we **do not** do comes first, and only then the consents. The sheet gives the
 * reason — «первый вопрос родителя: вы что, записываете детей?». The teacher has to be able
 * to answer with our screen rather than their own words, and four lines is what a person
 * remembers.
 *
 * 🔴 Анализ внимания по умолчанию **выключен**, and the sheet is worth quoting for why: «это
 * не осторожность, а уважение: включать наблюдение за вниманием ребёнка должно быть
 * осознанным действием, а не следствием того, что кто-то не снял галочку». The server keeps
 * it that way too — `record_attention` drops the bucket without the consent, so the default
 * survives a re-render of this component.
 */
export function ConsentStep({ onNext, consent152fzAt }: ConsentStepProps) {
  const { t } = useTranslation('desktop');
  const [setSpeech] = useSetSpeechConsentMutation();
  const [setAttention] = useSetAttentionConsentMutation();

  const [speech, setSpeechOn] = useState(true);
  // 🔴 Решение владельца 15.08 (OWNER_SCOPE §26.1): включён по умолчанию. Прежнее «выключен,
  // потому что включать наблюдение должно быть осознанным действием» было ревьюерской
  // осторожностью, а не решением владельца, и отменено: SEduM — то, ради чего продукт
  // существует, и приходить выключенным он не должен.
  //
  // ⚠️ Меняется УМОЛЧАНИЕ ЭКРАНА, а не право сервера: `record_attention` по-прежнему
  // отбрасывает корзину без согласия. Выключается здесь же одним нажатием — и преподавателем,
  // и учеником, в любой момент.
  const [attention, setAttentionOn] = useState(true);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const signedAt = consent152fzAt ? SIGNED_ON.format(new Date(consent152fzAt)) : null;

  const accept = async () => {
    setSaving(true);
    setFailed(null);
    try {
      // 🔴 ПОСЛЕДОВАТЕЛЬНО, А НЕ `Promise.all` (найдено аудитом 17.08).
      //
      // `Promise.all` отклоняется на первой ошибке, но вторая мутация уже ушла и выполнится.
      // Исход: одно согласие на сервере, другое нет, а экран говорит «не сохранилось» про оба.
      //
      // Направление важнее самого расхождения. Человек снял галочку «анализ внимания»,
      // `setAttention` не дошла, `setSpeech` дошла — на сервере согласие осталось прежним,
      // а по умолчанию оно ВКЛЮЧЕНО (§26.1). То есть он уверен, что выключил наблюдение за
      // вниманием ребёнка, а оно работает. Повтором лечится, но повтора не будет: он прочитал
      // «не сохранилось» и ушёл.
      //
      // Последовательно — значит вторая не уйдёт, если первая не прошла, и состояние на
      // сервере остаётся тем, каким было.
      await setSpeech({ variables: { granted: speech } });
      await setAttention({ variables: { granted: attention } });
      onNext();
    } catch (error) {
      // Согласие, которое «как будто сохранилось», — худший случай из всех: человек считает,
      // что сказал своё слово, а на сервере его нет.
      setFailed(stepFailureKey(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.step}>
      <h2 className={styles.h}>{t('setup.consents.title')}</h2>
      <p className={styles.p}>{t('setup.consents.body')}</p>

      {/* Сначала — чего мы НЕ делаем. */}
      <div className={styles.cardNever}>
        <div className={styles.cardHead}>
          <span className={styles.cardTitle}>{t('setup.consents.neverTitle')}</span>
          <span className={styles.tagGood}>{t('setup.consents.neverTag')}</span>
        </div>
        <ul className={styles.never}>
          <li>{t('setup.consents.neverVideo')}</li>
          <li>{t('setup.consents.neverAudio')}</li>
          <li>{t('setup.consents.neverTranscript')}</li>
          <li>{t('setup.consents.neverFrames')}</li>
        </ul>
      </div>

      <div className={styles.card}>
        <span className={styles.cardTitle}>{t('setup.consents.listTitle')}</span>

        {/* 🔴 152-ФЗ подписан ПРИ РЕГИСТРАЦИИ — здесь это справка, а не поле. Метка
            «обязательно» стояла без единого элемента управления рядом и читалась как поломка:
            человек искал галочку, которой нет. Теперь сказано, что уже подписано и когда. */}
        <div className={styles.consent}>
          <span className={styles.consentHead}>
            <b>{t('setup.consents.pd')}</b>
            <span className={styles.tagGood}>
              {signedAt
                ? t('setup.consents.signedOn', { date: signedAt })
                : t('setup.consents.signed')}
            </span>
          </span>
          <small>{t('setup.consents.pdHint')}</small>
        </div>

        <label className={styles.consent}>
          <span className={styles.consentHead}>
            <input
              type="checkbox"
              checked={speech}
              onChange={(e) => setSpeechOn(e.target.checked)}
            />
            <b>{t('setup.consents.speech')}</b>
            <span className={styles.tagStrong}>{t('setup.consents.required')}</span>
          </span>
          <small>{t('setup.consents.speechHint')}</small>
        </label>

        <label className={styles.consent}>
          <span className={styles.consentHead}>
            <input
              type="checkbox"
              checked={attention}
              onChange={(e) => setAttentionOn(e.target.checked)}
            />
            <b>{t('setup.consents.attention')}</b>
            <span className={styles.tag}>{t('setup.consents.optional')}</span>
          </span>
          <small>{t('setup.consents.attentionHint')}</small>
        </label>
      </div>

      {/* Причина словами — на каждом шаге, а не только на первом. */}

      {failed && (

        <p className={styles.warn} role="alert">

          {t(failed)}

        </p>

      )}


      <button type="button" className={styles.btn} disabled={saving} onClick={() => void accept()}>
        {t('setup.consents.accept')}
      </button>
      <p className={styles.note}>{t('setup.consents.parents')}</p>
    </div>
  );
}
