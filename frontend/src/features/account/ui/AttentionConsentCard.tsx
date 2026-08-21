import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  useMeQuery,
  useSetAttentionConsentMutation,
} from '@/entities/graphql/generated';
import { failureText } from '@/shared/lib/requestFailure';

import { Checkbox } from '@/shared/ui';

import styles from './account.module.css';

/**
 * 🔴 «КАМЕРА И ВНИМАНИЕ» — БЛОК ЛИСТА D8, БЕЗ КОТОРОГО SEduM НЕ ПИШЕТ НИЧЕГО.
 *
 * Найдено аудитом 17.08 и оказалось крупнейшим провалом продукта: **единственный экран
 * согласия на анализ внимания жил в мастере первого запуска ПРЕПОДАВАТЕЛЯ**. У ученика поле
 * `consent_attention` оставалось `False` навсегда — умолчание модели, — и `record_attention`
 * отбрасывал каждое ведро.
 *
 * То есть CMF, главный отличитель Flamingo (CLAUDE.md §1), **не записал ни одного числа за
 * всё время существования проекта**. Инвариант приватности исполнен идеально, а самой функции
 * не было: конвейер на устройстве считал, отправлял и получал молчаливый отказ.
 *
 * Почему не поймали: тест `test_attention_consent.py` включает согласие ПРИСВАИВАНИЕМ ПОЛЯ
 * в Python, а не мутацией. Он проверяет, что сервер умеет принять данные, и никогда не
 * спрашивает, есть ли путь к этому состоянию.
 *
 * 🔒 Инварианты §2.1 не двигаются ни на строку: наружу уходит только агрегат за корзину,
 * кадры и покадровые признаки не покидают устройство. Текст блока — из листа D8, словами
 * ребёнка, и это не украшение: человек соглашается на то, что понял.
 */
export function AttentionConsentCard() {
  const { t } = useTranslation('account');
  const { data, loading, refetch } = useMeQuery();
  const [setAttention, { loading: saving }] = useSetAttentionConsentMutation();
  const [failed, setFailed] = useState<string | null>(null);

  const granted = data?.me?.consentAttention ?? null;

  const toggle = async () => {
    if (granted === null) return;
    setFailed(null);
    try {
      await setAttention({ variables: { granted: !granted } });
      // `setAttentionConsent` возвращает голый `Boolean` и кэш `User` не обновляет —
      // без этого переключатель отскочил бы назад.
      await refetch();
    } catch (error) {
      setFailed(failureText(error));
    }
  };

  return (
    <section className={styles.card} aria-labelledby="attention-title">
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle} id="attention-title">
          {t('attention.title')}
        </h2>
        <span className={styles.tag}>SEduM</span>
      </div>

      {/*
        🔴 ГАЛОЧКА ИЗ НАБОРА, А НЕ СВОЯ (§48 п.4). Здесь стоял собственный `<input>` целью
        13 px при норме 44 — на карточке, где человек как раз и принимает решение о своей
        камере. Наборная галочка даёт полную строку целью и настоящий квадрат 20 px, а сам
        `input` спрятан общим рецептом, который не убегает за кадр.

        Расхождение чинится в наборе и берётся отсюда — иначе следующий экран заведёт третью
        галочку с третьим размером.
      */}
      <Checkbox
        checked={granted ?? false}
        disabled={loading || saving || granted === null}
        onChange={() => void toggle()}
      >
        <b>{t('attention.analyse')}</b>
        <small className={styles.hint}>{t('attention.analyseHint')}</small>
      </Checkbox>

      {/* 🔒 Лист D8: «что уходит с этого компьютера» — словами ребёнка, а не юриста.
          Человек соглашается на то, что понял, поэтому блок стоит рядом с переключателем,
          а не в сноске и не под раскрытием. */}
      <div className={styles.privacy}>
        <span className={styles.privacyTitle}>{t('attention.leavesTitle')}</span>
        <p>{t('attention.leavesNothing')}</p>
        <p>{t('attention.leavesOne')}</p>
        <p>{t('attention.leavesNever')}</p>
      </div>

      {granted === null && !loading && (
        <p className={styles.warn} role="alert">
          {t('attention.unknown')}
        </p>
      )}
      {failed && (
        <p className={styles.warn} role="alert">
          {t(failed)}
        </p>
      )}
    </section>
  );
}
