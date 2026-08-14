import { useTranslation } from 'react-i18next';

import { CLASS_LAYOUTS, type ClassLayout } from '../classLayout';

import styles from './roomframe.module.css';

/**
 * «вдвоём · группа · ученик рядом» — atlas sheet D1.
 *
 * Lives beside the window switcher and **only while the «Класс» window is open**: in the other
 * windows it would have nothing to switch. In the desktop app both switchers are published
 * into the status strip; in a browser tab they stay in the room's own row. Same component,
 * two homes — which is why it takes no opinion about where it is drawn.
 */
export function ClassLayoutSwitch({
  layout,
  onLayout,
}: {
  layout: ClassLayout;
  onLayout: (layout: ClassLayout) => void;
}) {
  const { t } = useTranslation('desktop');

  return (
    <span className={styles.layoutSwitch} role="tablist" aria-label={t('layout.label')}>
      {CLASS_LAYOUTS.map((id) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={layout === id}
          className={styles.win}
          onClick={() => onLayout(id)}
        >
          {t(`layout.${id}`)}
        </button>
      ))}
    </span>
  );
}
