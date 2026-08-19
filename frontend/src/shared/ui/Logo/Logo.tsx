import { isDesktop } from '@/features/desktop/bridge';

import styles from './Logo.module.css';

/**
 * Flamingo lockup: the mark, then the wordmark with its coral dot.
 * "flamingo" is the brand name, not UI copy — it is never translated.
 *
 * The bird is deliberately crude (docs/brand/flamingo-brandbook.html, owner pick 14.08.2026):
 * uneven line weights, kinked legs, a neck attached off-centre. Do not straighten it — a tidy
 * flamingo turns a school into a bank. Geometry is a copy of design-assets/flamingo-bird.svg;
 * it is inline rather than an <img> so it inherits colour and never flashes on load.
 *
 * `mark={false}` drops the bird for places where the wordmark stands alone (a favicon-sized
 * header, a dense toolbar). Below ~28px the drawing loses its neck — use the separate
 * small-size drawing instead of shrinking this one.
 */
export function Logo({
  as: Tag = 'span',
  mark = true,
  word = true,
}: {
  as?: 'span' | 'h1';
  mark?: boolean;
  /**
   * `word={false}` — одна птица, без слова. Для мест, где на подпись нет ширины: плавающий
   * пульт комнаты (лист «Комната урока») ставит знак 20 × 20 вплотную к «выйти из урока», и
   * слово наезжало на кнопку.
   */
  word?: boolean;
}) {
  /**
   * 🔴 В ПРИЛОЖЕНИИ ЗНАК ОДИН РАЗ — В ЗАГОЛОВКЕ ОКНА (владелец 16.08, промпт 21 §2.4).
   *
   * Рама приложения (`DesktopFrame`) рисует птицу слева в заголовке. Страница внутри рисовала
   * свой логотип целиком — и две одинаковые птицы оказывались в двадцати пикселях друг от
   * друга. В браузере такого нет: там заголовка окна нашего нет вовсе.
   *
   * Различаем здесь, В ОДНОМ МЕСТЕ, а не проверками `isDesktop()` по экранам: страниц с
   * логотипом уже шесть, и седьмая забудет проверку — как забыли эту.
   */
  const showMark = mark && !isDesktop();

  return (
    <Tag className={styles.logo}>
      {showMark && (
        <svg className={styles.mark} viewBox="0 0 120 110" aria-hidden="true" focusable="false">
          <g fill="none" stroke="var(--color-accent)" strokeLinecap="round">
            <path d="M28 55 L7 44" strokeWidth="5.4" />
            <path d="M26 61 L3 59" strokeWidth="7" />
            <path d="M28 66 L10 74" strokeWidth="5.8" />
            <path d="M44 80 L39 92 L36 103" strokeWidth="5.6" />
            <path d="M57 78 L59 90 L56 102" strokeWidth="5" />
          </g>
          <path
            d="M58 52 C70 44 60 28 74 16"
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <ellipse cx="48" cy="63" rx="26" ry="21" fill="var(--color-accent)" transform="rotate(-6 48 63)" />
          <circle cx="78" cy="13" r="8.5" fill="var(--color-accent)" />
          <path d="M85 7 L108 14 L86 19 Z" fill="var(--color-text)" />
          <circle cx="77" cy="8" r="2.2" fill="var(--color-surface)" />
        </svg>
      )}
      {word && (
        <span className={styles.word}>
          flamingo
          <span className={styles.dot} aria-hidden="true" />
        </span>
      )}
    </Tag>
  );
}
