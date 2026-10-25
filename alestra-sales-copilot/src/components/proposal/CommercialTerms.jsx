/**
 * CommercialTerms — plazo del contrato y condiciones comerciales del catálogo.
 */
'use client';

import { dinero } from '../../lib/formatters';
import styles from './Proposal.module.css';

const PLAZOS = [
  { meses: 12, desc: 'Precio de lista' },
  { meses: 24, desc: '−5% mensualidades' },
  { meses: 36, desc: '−10% mensualidades' },
];

export default function CommercialTerms({ plazo, onPlazo, condiciones = [], prop }) {
  const tt = prop.totales;
  return (
    <div className={styles.terms}>
      <div role="radiogroup" aria-label="Plazo del contrato" className={styles.plazos}>
        {PLAZOS.map((p) => (
          <button key={p.meses} type="button" role="radio" aria-checked={plazo === p.meses} className={plazo === p.meses ? styles.plazoOn : styles.plazo} onClick={() => onPlazo(p.meses)}>
            <strong>{p.meses} meses</strong>
            <span>{p.desc}</span>
          </button>
        ))}
      </div>

      <dl className={styles.breakdown}>
        <div><dt>Mensualidad bruta</dt><dd>{dinero(tt.mensualBrutoMxn)}</dd></div>
        <div><dt>Descuentos</dt><dd className={styles.green}>−{dinero(tt.descuentoMensualMxn)}</dd></div>
        {tt.consumoEstimadoMensualMxn > 0 && <div><dt>Consumo estimado</dt><dd>{dinero(tt.consumoEstimadoMensualMxn)}</dd></div>}
        <div><dt>IVA 16%</dt><dd>{dinero(tt.mensualIvaMxn)}</dd></div>
        <div className={styles.total}><dt>Mensualidad con IVA</dt><dd>{dinero(tt.mensualConIvaMxn)}</dd></div>
        <div><dt>Cargos únicos en 3 mensualidades</dt><dd>{dinero(tt.cargoUnicoEnMensualidadesMxn)}</dd></div>
      </dl>

      {prop.paquetesAplicados.length > 0 && (
        <p className={styles.green}>Paquetes aplicados: {prop.paquetesAplicados.map((p) => `${p.nombre} (−${p.descuentoPct}%)`).join(', ')}</p>
      )}
      {prop.advertencias.map((a) => <p key={a} className={styles.warn}>⚠ {a}</p>)}

      <details className={styles.conds}>
        <summary>Condiciones comerciales del catálogo ({condiciones.length})</summary>
        <ul>
          {condiciones.map((c) => <li key={c.concepto}><strong>{c.concepto}:</strong> {c.regla}</li>)}
        </ul>
      </details>
    </div>
  );
}
