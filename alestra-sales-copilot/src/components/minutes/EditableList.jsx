/**
 * EditableList — lista de textos editable (agregar, editar, quitar). Usada por las secciones de la minuta.
 */
'use client';

import styles from './Minutes.module.css';

export default function EditableList({ items = [], onChange, placeholder = 'Agregar…', marca, etiqueta }) {
  const set = (i, v) => onChange(items.map((x, j) => (j === i ? v : x)));
  return (
    <div className={styles.list}>
      {items.map((it, i) => (
        <div key={i} className={styles.listRow}>
          {marca && <span className={styles.mark} aria-hidden="true">{marca}</span>}
          <input className={styles.input} value={it} onChange={(e) => set(i, e.target.value)} aria-label={`${etiqueta ?? 'Elemento'} ${i + 1}`} />
          <button type="button" className={styles.x} onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={`Quitar ${etiqueta ?? 'elemento'} ${i + 1}`}>✕</button>
        </div>
      ))}
      <button type="button" className={styles.add} onClick={() => onChange([...items, ''])}>+ {placeholder}</button>
    </div>
  );
}
