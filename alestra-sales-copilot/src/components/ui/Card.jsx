/**
 * Card — contenedor de tarjeta reutilizable.
 */
import styles from './Card.module.css';

export default function Card({ children, className = '', padding = 'md', shadow = true }) {
  return (
    <div
      className={[
        styles.card,
        styles[`padding_${padding}`],
        shadow ? styles.shadow : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}
