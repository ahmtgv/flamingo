import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './subject.module.css';

export interface QuietActions {
  savedId?: string | null;
  /** Extra class for the wrapper — the rail pins the corner to the row (sheet 01). */
  className?: string;
  /** Keep it, optionally with a note (the sheet's "+ заметка"). */
  onSave: (note: string, watchLater: boolean) => void;
  onRemove: () => void;
  /** Hands over the LINK. Sharing never copies the content — the licence stays with the
   *  source (owner req. 12); chat targets arrive with the chat module. */
  shareUrl?: string | null;
}

/**
 * The quiet corner "^" — the same gesture everywhere (atlas sheet 12, reused by sheet 01).
 *
 * It stays out of the way until hovered or focused, and opens the small menu the sheet
 * defines: keep it, keep it for later, share the link.
 */
export function QuietCorner({ savedId, onSave, onRemove, shareUrl, className }: QuietActions) {
  const { t } = useTranslation('subject');
  const [open, setOpen] = useState(false);
  const [noting, setNoting] = useState(false);
  const [note, setNote] = useState('');
  const [shared, setShared] = useState(false);
  const root = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) {
        setOpen(false);
        setNoting(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setNoting(false);
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function share() {
    if (shareUrl) {
      try {
        await navigator.clipboard?.writeText(shareUrl);
      } catch {
        /* clipboard may be unavailable — the menu still says what would be shared */
      }
    }
    setShared(true);
    window.setTimeout(() => setShared(false), 2000);
  }

  return (
    <span className={`${styles.quietWrap} ${className ?? ''}`} ref={root}>
      <button
        type="button"
        className={styles.quiet}
        aria-label={t('quiet.open')}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        ^
      </button>
      {open && (
        <div className={styles.qmenu} role="menu">
          {noting ? (
            <form
              className={styles.qnote}
              onSubmit={(e) => {
                e.preventDefault();
                onSave(note, false);
                setNote('');
                setNoting(false);
                setOpen(false);
              }}
            >
              <input
                className={styles.qinput}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t('quiet.notePlaceholder')}
                aria-label={t('quiet.notePlaceholder')}
                autoFocus
              />
              <div className={styles.qnoteRow}>
                <button type="submit" className={styles.qprimary}>
                  {t('quiet.noteSave')}
                </button>
                <button type="button" className={styles.qi} onClick={() => setNoting(false)}>
                  {t('quiet.cancel')}
                </button>
              </div>
            </form>
          ) : (
            <>
              {savedId ? (
                <button
                  type="button"
                  role="menuitem"
                  className={styles.qi}
                  onClick={() => {
                    onRemove();
                    setOpen(false);
                  }}
                >
                  {t('quiet.remove')}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    className={styles.qi}
                    onClick={() => setNoting(true)}
                  >
                    {t('quiet.save')}
                    <span className={styles.qhint}>{t('quiet.saveHint')}</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className={styles.qi}
                    onClick={() => {
                      onSave('', true);
                      setOpen(false);
                    }}
                  >
                    {t('quiet.watchLater')}
                  </button>
                </>
              )}
              <div className={styles.qsep} />
              <button
                type="button"
                role="menuitem"
                className={styles.qi}
                onClick={() => void share()}
              >
                {shared ? t('quiet.shareCopied') : t('quiet.share')}
                <span className={styles.qhint}>{t('quiet.shareHint')}</span>
              </button>
            </>
          )}
        </div>
      )}
    </span>
  );
}
