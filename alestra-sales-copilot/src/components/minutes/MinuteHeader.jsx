/**
 * MinuteHeader — título, fecha, objetivo y participantes editables.
 * Un participante sin nombre se marca "⚠ Sin confirmar" (Gemini no lo inventa).
 */
'use client';

import Badge from '../ui/Badge';
import styles from './Minutes.module.css';

export default function MinuteHeader({ minuta, fecha, onChange, onFecha }) {
  const participantes = minuta.participants ?? [];
  const setP = (i, k, v) => onChange({ participants: participantes.map((p, j) => (j === i ? { ...p, [k]: v || null } : p)) });
  return (
    <div className={styles.header}>
      <div className={styles.row2}>
        <label className={styles.field}>
          <span>Título</span>
          <input className={styles.input} value={minuta.title ?? ''} onChange={(e) => onChange({ title: e.target.value })} />
        </label>
        <label className={styles.field}>
          <span>Fecha de la reunión</span>
          <input type="date" className={styles.input} value={fecha ?? ''} onChange={(e) => onFecha(e.target.value)} />
        </label>
      </div>
      <label className={styles.field}>
        <span>Objetivo</span>
        <textarea className={styles.textarea} rows={2} value={minuta.objective ?? ''} onChange={(e) => onChange({ objective: e.target.value })} />
      </label>

      <div className={styles.field}>
        <span>Participantes</span>
        <div className={styles.people}>
          {participantes.map((p, i) => (
            <div key={i} className={styles.person}>
              <input className={styles.input} value={p.name ?? ''} placeholder="Nombre" onChange={(e) => setP(i, 'name', e.target.value)} aria-label={`Nombre del participante ${i + 1}`} />
              <input className={styles.input} value={p.company ?? ''} placeholder="Empresa" onChange={(e) => setP(i, 'company', e.target.value)} aria-label={`Empresa del participante ${i + 1}`} />
              <input className={styles.input} value={p.role ?? ''} placeholder="Rol" onChange={(e) => setP(i, 'role', e.target.value)} aria-label={`Rol del participante ${i + 1}`} />
              {!p.name ? <Badge variant="warning">⚠ Sin confirmar</Badge> : <span />}
              <button type="button" className={styles.x} onClick={() => onChange({ participants: participantes.filter((_, j) => j !== i) })} aria-label={`Quitar participante ${i + 1}`}>✕</button>
            </div>
          ))}
          <button type="button" className={styles.add} onClick={() => onChange({ participants: [...participantes, { name: null, company: '', role: '' }] })}>+ Agregar participante</button>
        </div>
      </div>
    </div>
  );
}
