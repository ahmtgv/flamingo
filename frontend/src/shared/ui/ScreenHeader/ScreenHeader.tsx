import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { HOME_ROUTE } from '@/shared/lib/homeRoute';

import styles from './ScreenHeader.module.css';

/**
 * ОДНА ШАПКА НА ПРОДУКТ (наряд 49 §1).
 *
 * 🔴 Двадцать мест рисовали верх экрана: пять рам-обёрток, рама приложения, рама комнаты и
 * двенадцать самодельных — плюс шесть экранов без верха вовсе. Четыре группы CSS-близнецов
 * совпадали до символа, а высота была задана ровно у двух из двадцати: у остальных она
 * вытекала из отступов, поэтому переход между экранами дёргал содержимое.
 *
 * Здесь одна высота (`--header-height`), один фон и пять слотов: знак · назад · заголовок ·
 * пояснение · действия. Второй фон допустим только явным пропом и с записанной причиной.
 *
 * ⚠️ `RoomFrame` сюда не переводится намеренно: он плавающий, с автоскрытием, и это лист
 * дизайнера. Он берёт из общего только токены.
 */
/**
 * Уйти отсюда — одним правилом на весь продукт.
 *
 * История длиной в один шаг означает прямой заход по адресу: `navigate(-1)` вынес бы
 * человека из продукта в браузер, а в приложении — в пустоту. Тогда идём домой.
 */
export function useGoBack(fallback: string = HOME_ROUTE): () => void {
  const navigate = useNavigate();
  return () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(fallback);
  };
}

export function ScreenHeader({
  title,
  meta,
  back,
  brand,
  actions,
  sticky = true,
}: {
  title?: ReactNode;
  /** Пояснение рядом с именем экрана: пояс, счётчик, состояние. */
  meta?: ReactNode;
  /**
   * Дверь назад. `to` — куда, если истории нет: прямой заход по адресу обязан иметь выход
   * (§2: из «Настроек» выйти было нечем вовсе).
   */
  back?: { label: string; to?: string };
  brand?: ReactNode;
  actions?: ReactNode;
  /** Прилипает к верху при прокрутке. Отключается там, где кадр не прокручивается. */
  sticky?: boolean;
}) {
  const goBack = useGoBack(back?.to);

  return (
    <header className={`${styles.header} ${sticky ? styles.sticky : ''}`}>
      {brand && <span className={styles.brand}>{brand}</span>}
      {back && (
        <button
          type="button"
          className={styles.back}
          onClick={goBack}
        >
          {back.label}
        </button>
      )}
      {title && <h1 className={styles.title}>{title}</h1>}
      {meta && <span className={styles.meta}>{meta}</span>}
      {actions && <span className={styles.actions}>{actions}</span>}
    </header>
  );
}
