/**
 * The Flamingo mark on its own — no wordmark beside it.
 *
 * For the title bar, the tray, a toolbar: places where the word does not fit but the brand
 * still has to be present. The lockup (mark + word) lives in `Logo`.
 *
 * Geometry is a copy of design-assets/flamingo-bird.svg. It is deliberately crude — uneven
 * line weights, kinked legs, a neck attached off-centre (docs/brand/flamingo-brandbook.html §01,
 * owner pick 14.08.2026). Do not straighten it.
 *
 * ⚠️ Below ~28px this drawing loses its neck and turns into a blob. That size has its own
 * drawing — design-assets/flamingo-bird-small.svg — used for the favicon and the app icon.
 * Do not shrink this one to fill a 16px slot.
 *
 * Colour comes from tokens, so dark theme needs no second file.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 110" aria-hidden="true" focusable="false">
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
  );
}
