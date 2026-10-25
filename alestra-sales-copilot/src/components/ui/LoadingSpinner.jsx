/**
 * LoadingSpinner — indicador de carga accesible.
 * size: sm | md | lg
 * label: texto para screen readers (default: "Cargando…")
 */
import styles from './LoadingSpinner.module.css';

export default function LoadingSpinner({ size = 'md', label = 'Cargando…', className = '' }) {
  return (
    <span
      role="status"
      aria-label={label}
      className={[styles.spinner, styles[size], className].filter(Boolean).join(' ')}
    >
      <span className={styles.ring} aria-hidden="true" />
      <span className={styles.srOnly}>{label}</span>
    </span>
  );
}
