/**
 * StepProgress — muestra en qué paso del flujo va la reunión activa.
 * Reunión → Copiloto → Diagnóstico → Minuta → Propuesta
 */
'use client';

import Link from 'next/link';
import { MEETING_STEPS_ORDER } from '../../lib/constants';
import styles from './StepProgress.module.css';

const ETIQUETAS = {
  meeting: { texto: 'Reunión', href: '/meeting?editar=1' },
  copilot: { texto: 'Copiloto', href: '/copilot' },
  diagnosis: { texto: 'Diagnóstico', href: '/diagnosis' },
  minutes: { texto: 'Minuta', href: '/minutes' },
  proposal: { texto: 'Propuesta', href: '/proposal' },
};

export default function StepProgress({ actual, meeting }) {
  const idx = MEETING_STEPS_ORDER.indexOf(actual);
  return (
    <nav className={styles.steps} aria-label="Pasos de la reunión">
      <ol>
        {MEETING_STEPS_ORDER.map((paso, i) => {
          const hecho = i < idx;
          const activo = i === idx;
          return (
            <li key={paso} className={[styles.step, hecho ? styles.done : '', activo ? styles.active : ''].filter(Boolean).join(' ')}>
              <Link href={ETIQUETAS[paso].href} aria-current={activo ? 'step' : undefined}>
                <span className={styles.num} aria-hidden="true">{hecho ? '✓' : i + 1}</span>
                <span>{ETIQUETAS[paso].texto}</span>
              </Link>
            </li>
          );
        })}
      </ol>
      {meeting?.company && (
        <p className={styles.client}>
          <strong>{meeting.company}</strong>
          {[meeting.industry, meeting.city, meeting.employees ? `${meeting.employees} empleados` : null].filter(Boolean).map((x) => ` · ${x}`)}
        </p>
      )}
    </nav>
  );
}
