/**
 * Diagnóstico — Tarea 7.
 * Productos del catálogo (validados contra SKUs reales), tipo de oportunidad, reglas de
 * escalamiento, paquetes y preguntas pendientes. Los precios salen del catálogo, nunca de Gemini.
 */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMeeting } from '../../context/MeetingContext';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import ErrorMessage from '../../components/ui/ErrorMessage';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StepProgress from '../../components/meeting/StepProgress';
import NoActiveMeeting from '../../components/meeting/NoActiveMeeting';
import ProductCard from '../../components/diagnosis/ProductCard';
import EscalationAlert from '../../components/diagnosis/EscalationAlert';
import PackageCard from '../../components/diagnosis/PackageCard';
import MissingInfoPanel from '../../components/diagnosis/MissingInfoPanel';
import FactsPanel from '../../components/diagnosis/FactsPanel';
import { useCatalogo, lineasDeReunion, hechosDeReunion } from '../../lib/useCatalogo';
import { calcularPropuesta, sugerenciasCatalogo } from '../../lib/commercialRules';
import { dinero, TIPO_OPORTUNIDAD, ESTADO_LINEA } from '../../lib/formatters';
import { CATALOG_DISCLAIMER } from '../../lib/constants';
import styles from '../../styles/pages.module.css';
import d from '../../components/diagnosis/Diagnosis.module.css';

export default function DiagnosisPage() {
  const router = useRouter();
  const { meeting, setMeeting, isHydrated } = useMeeting();
  const { catalogo, cargando, error } = useCatalogo();
  const [nuevoSku, setNuevoSku] = useState('');

  const hechos = hechosDeReunion(meeting);
  const prop = useMemo(() => {
    if (!catalogo || !meeting.recommendedProducts?.length) return null;
    return calcularPropuesta(catalogo, { lineas: lineasDeReunion(meeting), plazoMeses: meeting.contractTerm ?? 12, hechos });
  }, [catalogo, meeting]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mantener el resumen de la reunión al día (Dashboard, Minutas) sin entrar en ciclos.
  useEffect(() => {
    if (!prop) return;
    const razones = prop.escalamiento.razones;
    if (meeting.opportunityType !== prop.tipoOportunidad || meeting.escalationRequired !== prop.requiereArquitecto ||
        JSON.stringify(meeting.escalationReasons ?? []) !== JSON.stringify(razones)) {
      setMeeting({ opportunityType: prop.tipoOportunidad, escalationRequired: prop.requiereArquitecto, escalationReasons: razones });
    }
  }, [prop]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isHydrated || !meeting.id) return <NoActiveMeeting cargando={!isHydrated} />;
  if (!meeting.analysis && !meeting.recommendedProducts?.length) {
    return (
      <div className={styles.page}>
        <StepProgress actual="diagnosis" meeting={meeting} />
        <NoActiveMeeting titulo="Todavía no hay análisis" texto="Primero analiza la conversación en el Copiloto; aquí aparecerán los productos del catálogo y las reglas que aplican." destino="/copilot" boton="Ir al Copiloto" />
      </div>
    );
  }
  if (cargando) return <LoadingSpinner size="lg" label="Cargando catálogo…" />;
  if (error) return <ErrorMessage message={error} code="CATALOG_ERROR" />;

  const productos = meeting.recommendedProducts ?? [];
  const familias = Object.fromEntries((catalogo.familias ?? []).map((f) => [f.id, f.nombre]));
  const nombres = Object.fromEntries(catalogo.productos.map((p) => [p.sku, p.nombre]));
  const lineaDe = (sku) => prop?.lineas.find((l) => l.sku === sku);
  const tipo = TIPO_OPORTUNIDAD[prop?.tipoOportunidad ?? 'insuficiente'];
  const sug = sugerenciasCatalogo(catalogo, productos.map((p) => p.sku));
  const aplicados = new Set(prop?.paquetesAplicados.map((p) => p.id) ?? []);
  const cercanos = new Map(sug.paquetesCercanos.map((p) => [p.id, p.faltan]));
  const paquetesVisibles = (catalogo.paquetes ?? []).filter((p) => aplicados.has(p.id) || cercanos.has(p.id));

  const agregar = (skus, motivo) => {
    const nuevos = skus.filter((s) => !productos.some((p) => p.sku === s)).map((s) => catalogo.productos.find((p) => p.sku === s)).filter(Boolean);
    if (nuevos.length) setMeeting({ recommendedProducts: [...productos, ...nuevos] });
  };
  const quitar = (sku) => setMeeting({ recommendedProducts: productos.filter((p) => p.sku !== sku) });
  const setCantidad = (sku, v) => setMeeting({ quantities: { ...(meeting.quantities ?? {}), [sku]: v } });
  const setParametro = (sku, k, v) => setMeeting({ lineParams: { ...(meeting.lineParams ?? {}), [sku]: { ...(meeting.lineParams?.[sku] ?? {}), [k]: v } } });
  const setHecho = (k, v) => setMeeting({ facts: { ...(meeting.facts ?? {}), [k]: v } });
  const toggleRespuesta = (q) => setMeeting({ answeredQuestions: { ...(meeting.answeredQuestions ?? {}), [q]: !meeting.answeredQuestions?.[q] } });

  const preguntasCatalogo = [...new Set(productos.flatMap((p) => p.preguntas_clave ?? []))];
  const grupos = [
    { titulo: 'Información que falta', items: meeting.analysis?.missingInformation ?? [] },
    { titulo: 'Preguntas sugeridas', items: (meeting.analysis?.suggestedQuestions ?? []).filter((q) => !preguntasCatalogo.includes(q)) },
    { titulo: 'Preguntas clave del catálogo', items: preguntasCatalogo },
  ];

  const resumenArquitecto = () => [
    `Cliente: ${meeting.company} (${[meeting.industry, meeting.city, meeting.employees && `${meeting.employees} empleados`].filter(Boolean).join(', ')})`,
    `Contacto: ${meeting.clientName || 'por confirmar'}`,
    `Tipo de oportunidad: ${tipo.etiqueta}`,
    '', 'Resumen:', meeting.analysis?.summary ?? '',
    '', 'Lo que dijo el cliente:', meeting.transcription ?? '',
    '', 'Reglas de escalamiento:', ...prop.escalamiento.razones.map((r) => `- ${r}`),
    '', 'Productos considerados:',
    ...prop.lineas.map((l) => `- ${l.sku} ${l.nombre} · cantidad ${l.cantidad ?? 'por confirmar'} · ${ESTADO_LINEA[l.estado].etiqueta}`),
    '', 'Preguntas respondidas:', ...Object.entries(meeting.answeredQuestions ?? {}).filter(([, v]) => v).map(([q]) => `- ${q}`),
  ].join('\n');

  return (
    <div className={styles.page}>
      <StepProgress actual="diagnosis" meeting={meeting} />
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.title}>Diagnóstico</h2>
          <p className={styles.subtitle}>Confirma cantidades y hechos del cliente. La clasificación y las reglas de escalamiento se recalculan con el catálogo al momento.</p>
        </div>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={() => router.push('/minutes')}>Minuta</Button>
          <Button onClick={() => { setMeeting({ step: 'proposal' }); router.push('/proposal'); }}>Generar propuesta →</Button>
        </div>
      </div>

      {meeting.analysisSource === 'demo' && <ErrorMessage isDemoFallback message="Los productos se sugirieron por coincidencia de palabras con el catálogo (sin IA). Revísalos antes de cotizar." />}

      <Card>
        <div className={d.summaryBox}>
          <div>
            <h3>Tipo de oportunidad</h3>
            <Badge variant={tipo.variant}>{tipo.etiqueta}</Badge>
          </div>
          <p className={styles.muted}>{tipo.detalle}</p>
          <div>
            <h3>Mensual estimado (sin IVA)</h3>
            <span className={d.kpi}>{prop?.totales.mensualSinIvaMxn ? dinero(prop.totales.mensualSinIvaMxn) : '—'}</span>
            <p className={d.small}>Ficticio · solo productos con cantidad confirmada</p>
          </div>
        </div>
      </Card>

      {prop && <EscalationAlert escalamiento={prop.escalamiento} resumenArquitecto={resumenArquitecto} />}

      <div className={styles.grid2}>
        <div className={styles.stack}>
          <Card>
            <div className={styles.cardTitle}>
              <span>Productos recomendados ({productos.length})</span>
            </div>
            <div className={styles.stack}>
              {productos.map((p) => (
                <ProductCard
                  key={p.sku}
                  producto={p}
                  familia={familias[p.familia]}
                  linea={lineaDe(p.sku)}
                  cantidad={meeting.quantities?.[p.sku]}
                  parametros={meeting.lineParams?.[p.sku]}
                  empleados={meeting.employees}
                  onCantidad={(v) => setCantidad(p.sku, v)}
                  onParametro={(k, v) => setParametro(p.sku, k, v)}
                  onQuitar={() => quitar(p.sku)}
                />
              ))}
              {sug.prerrequisitosFaltantes.map((x) => (
                <ErrorMessage
                  key={x.sku}
                  message={`${x.nombre} necesita alguno de: ${x.requiereAlgunoDe.map((s) => nombres[s] ?? s).join(', ')}.`}
                  code="PRERREQUISITO"
                />
              ))}
              <div className={d.addRow}>
                <select className={d.input} value={nuevoSku} onChange={(e) => setNuevoSku(e.target.value)} aria-label="Agregar producto del catálogo">
                  <option value="">Agregar producto del catálogo…</option>
                  {(catalogo.familias ?? []).map((f) => (
                    <optgroup key={f.id} label={f.nombre}>
                      {catalogo.productos.filter((p) => p.familia === f.id && !productos.some((x) => x.sku === p.sku)).map((p) => (
                        <option key={p.sku} value={p.sku}>{p.sku} · {p.nombre}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <Button variant="secondary" disabled={!nuevoSku} onClick={() => { agregar([nuevoSku]); setNuevoSku(''); }}>Agregar</Button>
              </div>
            </div>
          </Card>

          {paquetesVisibles.length > 0 && (
            <Card>
              <h3 className={styles.cardTitle}>Paquetes</h3>
              <div className={d.packages}>
                {paquetesVisibles.map((p) => (
                  <PackageCard key={p.id} paquete={p} nombres={nombres} aplicado={aplicados.has(p.id)} faltan={cercanos.get(p.id)} onAgregarFaltantes={() => agregar(cercanos.get(p.id) ?? [])} />
                ))}
              </div>
              <p className={d.small} style={{ marginTop: 'var(--spacing-2)' }}>El descuento aplica cuando todos los productos del paquete tienen cantidad confirmada.</p>
            </Card>
          )}
        </div>

        <div className={styles.stack}>
          <Card>
            <h3 className={styles.cardTitle}>Levantamiento</h3>
            <MissingInfoPanel grupos={grupos} respondidas={meeting.answeredQuestions} onToggle={toggleRespuesta} />
          </Card>
          <Card>
            <h3 className={styles.cardTitle}>Hechos del cliente</h3>
            <p className={styles.muted} style={{ marginBottom: 'var(--spacing-3)' }}>Deciden si entra un arquitecto. Los marcados como “detectado” salieron de la conversación: confírmalos.</p>
            <FactsPanel hechos={hechos} detectados={meeting.detectedFacts} onChange={setHecho} />
          </Card>
        </div>
      </div>

      <p className={styles.disclaimer}>⚠ {CATALOG_DISCLAIMER} Precios simulados en MXN, sin IVA.</p>
    </div>
  );
}
