/**
 * ErrorMessage — bloque de error con código visible y opción de fallback demo.
 * Muestra el banner de modo demo cuando source='demo' o fallback=true.
 */
import styles from './ErrorMessage.module.css';

export default function ErrorMessage({
  message,
  code,
  isDemoFallback = false,
  onDismiss,
}) {
  if (!message) return null;

  if (isDemoFallback) {
    return (
      <div className={styles.demoBanner} role="alert">
        <span className={styles.demoIcon}>⚠</span>
        <div className={styles.demoText}>
          <strong>MODO DEMOSTRACIÓN</strong>
          <span>Los datos mostrados son ficticios y no provienen de una API real. {message}</span>
        </div>
        {onDismiss && (
          <button className={styles.dismiss} onClick={onDismiss} aria-label="Cerrar">
            ✕
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={styles.error} role="alert">
      <span className={styles.icon}>✕</span>
      <div className={styles.body}>
        <span className={styles.msg}>{message}</span>
        {code && <span className={styles.code}>{code}</span>}
      </div>
      {onDismiss && (
        <button className={styles.dismiss} onClick={onDismiss} aria-label="Cerrar">
          ✕
        </button>
      )}
    </div>
  );
}
