/**
 * StatsCard — tarjeta de métrica numérica para el Dashboard.
 */
import styles from './StatsCard.module.css';

export default function StatsCard({ label, value, sub, accent = false }) {
  return (
    <div className={[styles.card, accent ? styles.accent : ''].filter(Boolean).join(' ')}>
      <p className={styles.value}>{value}</p>
      <p className={styles.label}>{label}</p>
      {sub && <p className={styles.sub}>{sub}</p>}
    </div>
  );
}
