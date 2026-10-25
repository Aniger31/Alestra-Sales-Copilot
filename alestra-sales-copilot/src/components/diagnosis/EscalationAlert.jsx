/**
 * EscalationAlert — aviso visible cuando aplica una regla de escalamiento (ESC-01 … ESC-10)
 * o un umbral de producto. Permite copiar un resumen para que el cliente no repita su explicación.
 */
'use client';

import { useState } from 'react';
import Button from '../ui/Button';
import styles from './Diagnosis.module.css';

export default function EscalationAlert({ escalamiento, resumenArquitecto }) {
  const [copiado, setCopiado] = useState(false);
  if (!escalamiento?.requiere) {
    return (
      <div className={styles.okBox} role="status">
        <strong>✓ No se requiere arquitecto con la información actual.</strong>
        <span>Ninguna regla de escalamiento del catálogo se cumple. Confirma los hechos del cliente abajo.</span>
      </div>
    );
  }
  async function copiar() {
    try {
      await navigator.clipboard.writeText(resumenArquitecto());
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }
  return (
    <div className={styles.escalation} role="alert">
      <div>
        <strong>⚠ Se requiere revisión de un arquitecto de soluciones</strong>
        <ul>
          {escalamiento.reglas.map((r) => (
            <li key={r.id}><b>{r.id}</b> · {r.motivo}{r.texto && <span className={styles.small}> — Regla: {r.texto}</span>}</li>
          ))}
          {escalamiento.umbralesProducto.map((u) => (
            <li key={`${u.sku}-${u.motivo}`}><b>{u.producto}</b> · {u.motivo}</li>
          ))}
        </ul>
      </div>
      <Button size="sm" variant="secondary" onClick={copiar}>{copiado ? '✓ Copiado' : 'Copiar resumen para el arquitecto'}</Button>
    </div>
  );
}
