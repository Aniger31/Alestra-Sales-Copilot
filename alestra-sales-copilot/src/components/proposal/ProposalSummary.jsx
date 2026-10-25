/**
 * ProposalSummary — resumen de la oportunidad, tipo de caso y totales principales.
 */
'use client';

import Badge from '../ui/Badge';
import { dinero, TIPO_OPORTUNIDAD } from '../../lib/formatters';
import styles from './Proposal.module.css';

export default function ProposalSummary({ meeting, prop }) {
  const t = TIPO_OPORTUNIDAD[prop.tipoOportunidad] ?? TIPO_OPORTUNIDAD.insuficiente;
  const tt = prop.totales;
  return (
    <div className={styles.summary}>
      <div className={styles.summaryText}>
        <p className={styles.eyebrow}>Propuesta preliminar para</p>
        <h3 className={styles.client}>{meeting.company}</h3>
        <p className={styles.small}>{[meeting.clientName, meeting.industry, meeting.city, meeting.employees && `${meeting.employees} empleados`].filter(Boolean).join(' · ')}</p>
        <div className={styles.badges}>
          <Badge variant={t.variant}>{t.etiqueta}</Badge>
          {prop.requiereArquitecto && <Badge variant="accent">Parte con arquitecto</Badge>}
          {prop.requiereAutorizacionGerente && <Badge variant="warning">Requiere autorización del gerente</Badge>}
        </div>
        {meeting.analysis?.summary && <p className={styles.resumen}>{meeting.analysis.summary}</p>}
      </div>
      <dl className={styles.kpis}>
        <div className={styles.kpiMain}><dt>Mensualidad con IVA</dt><dd>{dinero(tt.mensualConIvaMxn)}</dd></div>
        <div><dt>Mensualidad sin IVA</dt><dd>{dinero(tt.mensualSinIvaMxn)}</dd></div>
        <div><dt>Cargos únicos con IVA</dt><dd>{dinero(tt.cargoUnicoConIvaMxn)}</dd></div>
        <div><dt>Valor del contrato ({prop.plazoMeses} m, sin IVA)</dt><dd>{dinero(tt.valorContratoSinIvaMxn, false)}</dd></div>
      </dl>
    </div>
  );
}
