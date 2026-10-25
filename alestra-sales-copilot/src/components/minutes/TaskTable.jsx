/**
 * TaskTable — tareas con descripción, responsable, fecha límite y estado.
 * Responsable o fecha vacíos = no se mencionaron → "⚠ Sin confirmar".
 */
'use client';

import Badge from '../ui/Badge';
import styles from './Minutes.module.css';

export default function TaskTable({ tasks = [], onChange }) {
  const set = (i, k, v) => onChange(tasks.map((t, j) => (j === i ? { ...t, [k]: v === '' ? null : v } : t)));
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr><th>Descripción</th><th>Responsable</th><th>Fecha límite</th><th>Estado</th><th aria-label="Quitar" /></tr>
        </thead>
        <tbody>
          {tasks.map((t, i) => (
            <tr key={i}>
              <td><input className={styles.input} value={t.description ?? ''} onChange={(e) => set(i, 'description', e.target.value)} aria-label={`Tarea ${i + 1}`} /></td>
              <td>
                <input className={styles.input} value={t.responsible ?? ''} placeholder="Sin asignar" onChange={(e) => set(i, 'responsible', e.target.value)} aria-label={`Responsable de la tarea ${i + 1}`} />
                {!t.responsible && <Badge variant="warning">⚠ Sin confirmar</Badge>}
              </td>
              <td>
                <input type="date" className={styles.input} value={t.dueDate ?? ''} onChange={(e) => set(i, 'dueDate', e.target.value)} aria-label={`Fecha límite de la tarea ${i + 1}`} />
                {!t.dueDate && <Badge variant="warning">⚠ Sin confirmar</Badge>}
              </td>
              <td>
                <select className={styles.input} value={t.status ?? 'pending'} onChange={(e) => set(i, 'status', e.target.value)} aria-label={`Estado de la tarea ${i + 1}`}>
                  <option value="pending">Pendiente</option>
                  <option value="done">Completada</option>
                </select>
              </td>
              <td><button type="button" className={styles.x} onClick={() => onChange(tasks.filter((_, j) => j !== i))} aria-label={`Quitar tarea ${i + 1}`}>✕</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className={styles.add} onClick={() => onChange([...tasks, { description: '', responsible: null, dueDate: null, status: 'pending' }])}>+ Agregar tarea</button>
    </div>
  );
}
