import styles from './Avatar.module.css';

export interface AvatarProps {
  initials: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Avatar({ initials, size = 'md' }: AvatarProps) {
  return (
    <span className={[styles.avatar, styles[size]].join(' ')} aria-hidden="true">
      {initials}
    </span>
  );
}
