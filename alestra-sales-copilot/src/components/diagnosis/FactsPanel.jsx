/**
 * FactsPanel — hechos del cliente que activan reglas de escalamiento.
 * Algunos se detectan en la conversación; el vendedor los confirma o corrige aquí.
 */
'use client';

import { REGULATORIOS } from '../../lib/commercialRules';
import styles from './Diagnosis.module.css';

const COMPLEJIDAD = [
  ['solucionHibrida', 'Combina nubes o nube + data center (ESC-06)'],
  ['aplicacionesSinDocumentar', 'Aplicaciones sin documentación (ESC-03)'],
  ['requiereGpu', 'Programas que necesitan GPU'],
  ['oracleRacODataGuard', 'Oracle con RAC o Data Guard (ESC-08)'],
  ['disenoFormalSolicitado', 'Pide diseño o documento técnico formal (ESC-10)'],
];
const NUMEROS = [
  ['rpoMinutos', 'RPO requerido (minutos)'],
  ['rtoHoras', 'RTO requerido (horas)'],
  ['disponibilidadPct', 'Disponibilidad requerida (%)'],
  ['oracleTB', 'Tamaño de la base Oracle (TB)'],
];

export default function FactsPanel({ hechos, detectados = {}, onChange }) {
  const reg = new Set(hechos.requisitosRegulatorios ?? []);
  const detectado = (k, v) => (Array.isArray(detectados[k]) ? detectados[k].includes(v) : detectados[k] === true || (detectados[k] != null && detectados[k] !== false && v === undefined));
  return (
    <div className={styles.facts}>
      <fieldset className={styles.fs}>
        <legend>Requisitos regulatorios (ESC-04)</legend>
        {Object.entries(REGULATORIOS).map(([k, t]) => (
          <label key={k} className={styles.check}>
            <input
              type="checkbox"
              checked={reg.has(k)}
              onChange={() => {
                const n = new Set(reg);
                n.has(k) ? n.delete(k) : n.add(k);
                onChange('requisitosRegulatorios', [...n]);
              }}
            />
            {t} {detectado('requisitosRegulatorios', k) && <span className={styles.detected}>detectado</span>}
          </label>
        ))}
      </fieldset>
      <fieldset className={styles.fs}>
        <legend>Complejidad</legend>
        {COMPLEJIDAD.map(([k, t]) => (
          <label key={k} className={styles.check}>
            <input type="checkbox" checked={!!hechos[k]} onChange={(e) => onChange(k, e.target.checked)} />
            {t} {detectados[k] === true && <span className={styles.detected}>detectado</span>}
          </label>
        ))}
      </fieldset>
      <fieldset className={styles.fs}>
        <legend>Niveles de servicio y datos (ESC-07, ESC-08)</legend>
        {NUMEROS.map(([k, t]) => (
          <label key={k} className={styles.num}>
            <span>{t}</span>
            <input type="number" min="0" step="any" className={styles.input} value={hechos[k] ?? ''} onChange={(e) => onChange(k, e.target.value === '' ? null : Number(e.target.value))} />
          </label>
        ))}
        <label className={styles.num}>
          <span>Integración con sistemas internos (ESC-05)</span>
          <input
            className={styles.input}
            value={(hechos.integracionSistemasInternos ?? []).join(', ')}
            placeholder="ERP, CRM… (vacío si no aplica)"
            onChange={(e) => onChange('integracionSistemasInternos', e.target.value ? e.target.value.split(/\s*,\s*/).filter(Boolean) : [])}
          />
        </label>
      </fieldset>
    </div>
  );
}
