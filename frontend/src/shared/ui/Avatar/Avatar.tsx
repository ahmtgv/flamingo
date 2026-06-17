import styles from './Avatar.module.css';

export interface AvatarProps {
  initials: string;
  size?: 'sm' | 'md' | 'lg';
  /** Presigned image URL; falls back to initials when absent. */
  src?: string | null;
}

export function Avatar({ initials, size = 'md', src }: AvatarProps) {
  const cls = [styles.avatar, styles[size]].join(' ');
  if (src) {
    return <img className={cls} src={src} alt="" />;
  }
  return (
    <span className={cls} aria-hidden="true">
      {initials}
    </span>
  );
}
