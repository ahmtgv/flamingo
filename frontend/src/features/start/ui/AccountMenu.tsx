import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { LearningProfilesQuery } from '@/entities/graphql/generated';
import { ICON_SM } from '@/shared/ui/iconSizes';

import styles from './start.module.css';

type Profile = LearningProfilesQuery['learningProfiles'][number];

function initials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

/**
 * Account menu of atlas sheet 00 — one account, several educations.
 *
 * Switching here re-scopes the whole start page, which is why it calls the R0.2 mutation and
 * lets the caller refetch rather than keeping a local copy of "which education am I in".
 */
export function AccountMenu({
  name,
  profiles,
  onSwitch,
  switching,
}: {
  name: { first: string; last: string };
  profiles: readonly Profile[];
  onSwitch: (id: string) => void;
  switching: boolean;
}) {
  const { t } = useTranslation('start');
  const [open, setOpen] = useState(false);

  /** Labels are composed HERE, never shipped from the server, so they stay translatable:
   *  "Ученик · 9А", "Курсант · English A2", "Учитель". */
  const profileTitle = (profile: Profile) => {
    const kind = t(`profile.${profile.kind.toLowerCase()}`);
    const detail =
      profile.kind === 'CADET' ? profile.courseTitle : (profile.groupName ?? profile.institutionName);
    return detail ? `${kind} · ${detail}` : kind;
  };

  const profileSubtitle = (profile: Profile) => {
    if (profile.kind === 'CADET') return t('profile.cadetSub');
    if (profile.kind === 'TEACHER')
      return t('profile.teacherSub', { institution: profile.institutionName ?? '' });
    return t('profile.pupilSub', {
      institution: profile.institutionName ?? '',
      count: profile.courseCount,
    });
  };
  const root = useRef<HTMLDivElement>(null);
  const active = profiles.find((p) => p.isActive);

  // Close on an outside click or Escape — a menu that traps the page is worse than no menu.
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={styles.acc} ref={root}>
      <button
        type="button"
        className={styles.accBtn}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t('account.menu')}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.avatar} aria-hidden="true">
          {initials(name.first, name.last)}
        </span>
        <span className={styles.accWho}>
          <span className={styles.accName}>
            {name.first} {name.last}
          </span>
          {active && <span className={styles.accCtx}>{profileTitle(active)}</span>}
        </span>
        <ChevronDown size={ICON_SM} aria-hidden="true" />
      </button>

      {open && (
        <div className={styles.accMenu} role="menu" aria-label={t('account.menu')}>
          <div className={styles.accHead}>
            {t('account.heading', { name: `${name.first} ${name.last}` })}
          </div>

          {profiles.map((profile) => (
            <button
              key={profile.id}
              type="button"
              role="menuitemradio"
              aria-checked={profile.isActive}
              className={styles.accItem}
              disabled={switching}
              onClick={() => {
                setOpen(false);
                if (!profile.isActive) onSwitch(profile.id);
              }}
            >
              <span className={styles.accIc} aria-hidden="true">
                {t(`profile.${profile.kind.toLowerCase()}`).charAt(0)}
              </span>
              <span>
                <span className={styles.accT}>{profileTitle(profile)}</span>
                <span className={styles.accS}>{profileSubtitle(profile)}</span>
              </span>
              <span className={styles.accMark}>{profile.isActive ? t('account.current') : ''}</span>
            </button>
          ))}

          {/* Adding an education, the account archive and privacy settings are their own
              phases; the sheet shows them, so they are present and honestly disabled. */}
          <button type="button" role="menuitem" className={styles.accItem} disabled>
            <span className={styles.accIc} aria-hidden="true">
              +
            </span>
            <span>
              <span className={styles.accT}>{t('account.add')}</span>
              <span className={styles.accS}>{t('account.addSub')}</span>
            </span>
            <span className={styles.accMark}>{t('account.soon')}</span>
          </button>

          <div className={styles.accSep} />

          <button type="button" role="menuitem" className={styles.accItem} disabled>
            <span className={styles.accIc} aria-hidden="true">
              А
            </span>
            <span>
              <span className={styles.accT}>{t('account.my')}</span>
              <span className={styles.accS}>{t('account.mySub')}</span>
            </span>
            <span className={styles.accMark}>{t('account.soon')}</span>
          </button>
          <button type="button" role="menuitem" className={styles.accItem} disabled>
            <span className={styles.accIc} aria-hidden="true">
              ⚙
            </span>
            <span>
              <span className={styles.accT}>{t('account.settings')}</span>
              <span className={styles.accS}>{t('account.settingsSub')}</span>
            </span>
            <span className={styles.accMark}>{t('account.soon')}</span>
          </button>

          <div className={styles.accFoot}>{t('account.foot')}</div>
        </div>
      )}
    </div>
  );
}
