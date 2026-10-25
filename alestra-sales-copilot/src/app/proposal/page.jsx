/**
 * Propuesta comercial — Tarea 10.
 * Precios, descuentos e IVA calculados con las reglas del catálogo (lib/commercialRules).
 * El Word se vuelve a calcular en el servidor: el navegador solo envía SKUs, cantidades y plazo.
 */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMeeting } from '../../context/MeetingContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import ErrorMessage from '../../components/ui/ErrorMessage';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StepProgress from '../../components/meeting/StepProgress';
import NoActiveMeeting from '../../components/meeting/NoActiveMeeting';
import ProposalSummary from '../../components/proposal/ProposalSummary';
import ProductTable from '../../components/proposal/ProductTable';
import CommercialTerms from '../../components/proposal/CommercialTerms';
import { useCatalogo, lineasDeReunion, hechosDeReunion } from '../../lib/useCatalogo';
import { calcularPropuesta, LEYENDA_PROPUESTA } from '../../lib/commercialRules';
import { descargarWord, nombreArchivo } from '../../lib/descargarWord';
import { fecha as fmtFecha } from '../../lib/formatters';
import { CATALOG_DISCLAIMER } from '../../lib/constants';
import styles from '../../styles/pages.module.css';
import p from '../../components/proposal/Proposal.module.css';

export default function ProposalPage() {
  const router = useRouter();
  const { meeting, setMeeting, isHydrated } = useMeeting();
  const { catalogo, cargando, error: errorCatalogo } = useCatalogo();
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState(null);

  const plazo = meeting.contractTerm ?? 12;
  const prop = useMemo(() => {
    if (!catalogo || !meeting.recommendedProducts?.length) return null;
    return calcularPropuesta(catalogo, {
      lineas: lineasDeReunion(meeting),
      plazoMeses: plazo,
      hechos: hechosDeReunion(meeting),
      fecha: meeting.proposalGeneratedAt ?? undefined,
    });
  }, [catalogo, meeting, plazo]);
  const hayCotizable = prop?.lineas.some((l) => l.estado === 'cotizable');

  // Marca de tiempo de la primera propuesta con precios (indicador: tiempo de propuesta).
  useEffect(() => {
    if (hayCotizable && !meeting.proposalGeneratedAt) setMeeting({ proposalGeneratedAt: new Date().toISOString(), step: 'proposal' });
  }, [hayCotizable]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isHydrated || !meeting.id) return <NoActiveMeeting cargando={!isHydrated} />;
  if (!meeting.recommendedProducts?.length) {
    return (
      <div className={styles.page}>
        <StepProgress actual="proposal" meeting={meeting} />
        <NoActiveMeeting titulo="La propuesta necesita productos" texto="Analiza la conversación y confirma cantidades en el Diagnóstico." destino="/diagnosis" boton="Ir al Diagnóstico" />
      </div>
    );
  }
  if (cargando) return <LoadingSpinner size="lg" label="Cargando catálogo…" />;
  if (errorCatalogo) return <ErrorMessage message={errorCatalogo} code="CATALOG_ERROR" />;

  async function exportar() {
    setExportando(true);
    setError(null);
    try {
      await descargarWord(
        'proposal',
        {
          titulo: `Propuesta Comercial Preliminar — ${meeting.company}`,
          cliente: meeting.clientName,
          empresa: meeting.company,
          resumen: meeting.analysis?.summary || 'Solución propuesta con productos del catálogo.',
          condiciones: [LEYENDA_PROPUESTA, ...(catalogo.condiciones_comerciales ?? []).map((c) => `${c.concepto}: ${c.regla}`)],
          // Solo SKUs, cantidades y plazo: el servidor recalcula precios con el catálogo
          lineas: lineasDeReunion(meeting),
          plazoMeses: plazo,
          hechos: hechosDeReunion(meeting),
          fecha: prop.fecha,
        },
        nombreArchivo('Propuesta', meeting.company, prop.fecha),
      );
      setMeeting({ proposalExportedAt: new Date().toISOString() });
    } catch (e) {
      setError({ message: e.message, code: 'DOCUMENT_GENERATION_FAILED' });
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className={styles.page}>
      <StepProgress actual="proposal" meeting={meeting} />
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.title}>Propuesta comercial preliminar</h2>
          <p className={styles.subtitle}>Vigente hasta {fmtFecha(prop.vigenciaHasta)} · precios del catálogo simulado en MXN.</p>
        </div>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={() => router.push('/diagnosis')}>← Ajustar cantidades</Button>
          <Button onClick={exportar} loading={exportando} disabled={exportando || !hayCotizable}>Descargar Word</Button>
        </div>
      </div>

      <div className={p.legal} role="note">
        <span aria-hidden="true">⚠</span>
        <span>Propuesta preliminar de demostración. No es una cotización oficial de Alestra. {CATALOG_DISCLAIMER} Sin IVA salvo donde se indica. Vigencia: 30 días.</span>
      </div>
      {error && <ErrorMessage message={error.message} code={error.code} onDismiss={() => setError(null)} />}
      {meeting.proposalExportedAt && <p className={styles.muted}>✓ Word descargado el {fmtFecha(meeting.proposalExportedAt)}.</p>}

      <Card><ProposalSummary meeting={meeting} prop={prop} /></Card>

      <Card>
        <h3 className={styles.cardTitle}>Productos y servicios</h3>
        <ProductTable lineas={prop.lineas} />
      </Card>
      <Card>
        <h3 className={styles.cardTitle}>Condiciones</h3>
        <CommercialTerms plazo={plazo} onPlazo={(m) => setMeeting({ contractTerm: m })} condiciones={catalogo.condiciones_comerciales} prop={prop} />
      </Card>
    </div>
  );
}
