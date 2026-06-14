import styles from './Logo.module.css';

/** Flamingo wordmark + coral dot. "flamingo" is the brand name, not UI copy. */
export function Logo({ as: Tag = 'span' }: { as?: 'span' | 'h1' }) {
  return (
    <Tag className={styles.logo}>
      flamingo
      <span className={styles.dot} aria-hidden="true" />
    </Tag>
  );
}
