/**
 * ProductTable — productos cotizados con precios del catálogo, más los que quedan
 * por confirmar o con arquitecto (sin sumar al total).
 */
'use client';

import Badge from '../ui/Badge';
import { dinero, ESTADO_LINEA } from '../../lib/formatters';
import styles from './Proposal.module.css';

export default function ProductTable({ lineas }) {
  const cot = lineas.filter((l) => l.estado === 'cotizable');
  const otras = lineas.filter((l) => l.estado !== 'cotizable');
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>SKU</th><th>Producto</th><th className={styles.r}>Cant.</th><th className={styles.r}>Precio mensual</th>
            <th className={styles.r}>Cargo único</th><th className={styles.r}>Desc.</th><th className={styles.r}>Mensual</th>
          </tr>
        </thead>
        <tbody>
          {cot.map((l) => (
            <tr key={l.sku}>
              <td><code>{l.sku}</code></td>
              <td><strong>{l.nombre}</strong>{l.notas.length > 0 && <span className={styles.note}>{l.notas.join(' ')}</span>}</td>
              <td className={styles.r}>{l.cantidad ?? '—'}</td>
              <td className={styles.r}>{l.precioUnitarioMensualMxn != null ? dinero(l.precioUnitarioMensualMxn) : 'Consumo'}</td>
              <td className={styles.r}>{l.cargoUnicoMxn ? dinero(l.cargoUnicoMxn) : '—'}</td>
              <td className={styles.r}>{l.descuentoPct ? <span title={l.descuentos.map((d) => `${d.concepto}: ${d.pct}%`).join('\n')}>{l.descuentoPct}%</span> : '—'}</td>
              <td className={styles.r}><strong>{dinero(l.mensualNetoMxn)}</strong></td>
            </tr>
          ))}
          {cot.length === 0 && (
            <tr><td colSpan={7} className={styles.emptyRow}>Ningún producto tiene cantidad confirmada todavía. Complétalas en Diagnóstico.</td></tr>
          )}
        </tbody>
      </table>

      {otras.length > 0 && (
        <div className={styles.others}>
          <h4>No se suman al total</h4>
          <ul>
            {otras.map((l) => (
              <li key={l.sku}>
                <Badge variant={ESTADO_LINEA[l.estado].variant}>{ESTADO_LINEA[l.estado].etiqueta}</Badge>
                <span><strong>{l.nombre}</strong> <code>{l.sku}</code> — {l.notas.join(' ')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
