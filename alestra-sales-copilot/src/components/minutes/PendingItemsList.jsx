/**
 * PendingItemsList — información pendiente de confirmar con el cliente.
 */
'use client';

import EditableList from './EditableList';
import styles from './Minutes.module.css';

export default function PendingItemsList({ items = [], onChange }) {
  return (
    <div className={styles.pending}>
      <EditableList items={items} onChange={onChange} placeholder="Agregar pendiente" marca="⚠" etiqueta="Pendiente" />
    </div>
  );
}
