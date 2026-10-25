/**
 * MissingInfoPanel — preguntas pendientes del análisis + preguntas clave del catálogo.
 * El vendedor las marca como respondidas; el avance indica si el levantamiento se
 * puede cerrar en esta sesión (indicador del reto: 3 sesiones → 1).
 */
'use client';

import styles from './Diagnosis.module.css';

export default function MissingInfoPanel({ grupos, respondidas = {}, onToggle }) {
  const todas = grupos.flatMap((g) => g.items);
  const hechas = todas.filter((q) => respondidas[q]).length;
  const pct = todas.length ? Math.round((hechas / todas.length) * 100) : 0;
  return (
    <div className={styles.missing}>
      <div className={styles.progressHead}>
        <strong className={styles.pct}>{pct}%</strong>
        <span className={styles.small}>{hechas} de {todas.length} preguntas respondidas · meta: cerrar el levantamiento en esta sesión</span>
      </div>
      <div className={styles.progress} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Avance del levantamiento">
        <span style={{ width: `${pct}%` }} />
      </div>
      {grupos.filter((g) => g.items.length).map((g) => (
        <fieldset key={g.titulo} className={styles.qGroup}>
          <legend>{g.titulo}</legend>
          {g.items.map((q) => (
            <label key={q} className={[styles.q, respondidas[q] ? styles.qDone : ''].filter(Boolean).join(' ')}>
              <input type="checkbox" checked={!!respondidas[q]} onChange={() => onToggle(q)} />
              <span>{q}</span>
            </label>
          ))}
        </fieldset>
      ))}
    </div>
  );
}
