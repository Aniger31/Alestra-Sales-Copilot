/**
 * MeetingCard — tarjeta de resumen de una reunión en el Dashboard.
 */
import Link from 'next/link';
import Badge from '../ui/Badge';
import styles from './MeetingCard.module.css';

const STEP_LABELS = {
  meeting:   'Formulario',
  copilot:   'Transcripción',
  diagnosis: 'Diagnóstico',
  minutes:   'Minuta',
  proposal:  'Propuesta',
};

const STEP_VARIANTS = {
  meeting:   'default',
  copilot:   'info',
  diagnosis: 'accent',
  minutes:   'warning',
  proposal:  'success',
};

export default function MeetingCard({ meeting, onSelect }) {
  const stepLabel   = STEP_LABELS[meeting.step]  ?? meeting.step;
  const stepVariant = STEP_VARIANTS[meeting.step] ?? 'default';
  const fecha = meeting.meetingDate
    ? new Date(meeting.meetingDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Sin fecha';

  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <div className={styles.info}>
          <p className={styles.company}>{meeting.company || 'Empresa sin nombre'}</p>
          <p className={styles.client}>{meeting.clientName || '—'}</p>
        </div>
        <Badge variant={stepVariant}>{stepLabel}</Badge>
      </div>
      <div className={styles.meta}>
        <span>{meeting.industry || 'Sin industria'}</span>
        <span className={styles.dot}>·</span>
        <span>{fecha}</span>
      </div>
      <button
        className={styles.action}
        onClick={() => onSelect(meeting)}
        type="button"
      >
        Continuar →
      </button>
    </div>
  );
}
