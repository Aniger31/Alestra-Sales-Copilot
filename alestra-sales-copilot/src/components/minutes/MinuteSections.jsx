/**
 * MinuteSections — resumen, temas, decisiones, acuerdos y próximos pasos editables.
 */
'use client';

import EditableList from './EditableList';
import styles from './Minutes.module.css';

const SECCIONES = [
  ['topics', 'Temas tratados', 'Agregar tema'],
  ['decisions', 'Decisiones', 'Agregar decisión'],
  ['agreements', 'Acuerdos', 'Agregar acuerdo'],
  ['nextSteps', 'Próximos pasos', 'Agregar paso'],
];

export default function MinuteSections({ minuta, onChange }) {
  return (
    <div className={styles.sections}>
      <label className={styles.field}>
        <span>Resumen ejecutivo</span>
        <textarea className={styles.textarea} rows={4} value={minuta.summary ?? ''} onChange={(e) => onChange({ summary: e.target.value })} />
      </label>
      <div className={styles.grid}>
        {SECCIONES.map(([k, t, ph]) => (
          <div key={k} className={styles.field}>
            <span>{t}</span>
            <EditableList items={minuta[k] ?? []} onChange={(v) => onChange({ [k]: v })} placeholder={ph} etiqueta={t} />
            {!(minuta[k] ?? []).length && <p className={styles.hint}>Sin elementos: no se mencionaron en la conversación.</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
