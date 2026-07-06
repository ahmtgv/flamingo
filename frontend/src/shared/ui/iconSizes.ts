/**
 * Single source for lucide icon sizes (B-1). The icon `size` prop is a NUMBER, so it can't
 * read a CSS var — these constants mirror the `--icon-size-*` scale in
 * `shared/styles/tokens.css` and MUST stay in sync with it.
 *
 * Mapping rule (reviewer): 15/16 → SM, 18/20 → MD, 22/24+ → LG. Sub-16 micro-glyphs inside
 * chips/badges (mic-off, live dot, tile meta at 12–14px) are BELOW this scale by design and
 * stay as inline literals — bumping them to 16 would change chip/badge density.
 */
export const ICON_SM = 16; // --icon-size-sm
export const ICON_MD = 20; // --icon-size-md
export const ICON_LG = 24; // --icon-size-lg
