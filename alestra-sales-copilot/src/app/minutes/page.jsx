/**
 * Minutas — Tareas 8 y 9.
 * Genera la minuta (POST /api/minutes), permite editarla y la exporta a Word
 * (POST /api/documents) después de una confirmación explícita.
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMeeting } from '../../context/MeetingContext';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import ErrorMessage from '../../components/ui/ErrorMessage';
import StepProgress from '../../components/meeting/StepProgress';
import NoActiveMeeting from '../../components/meeting/NoActiveMeeting';
import MinuteHeader from '../../components/minutes/MinuteHeader';
import MinuteSections from '../../components/minutes/MinuteSections';
import TaskTable from '../../components/minutes/TaskTable';
import PendingItemsList from '../../components/minutes/PendingItemsList';
import { descargarWord, nombreArchivo } from '../../lib/descargarWord';
import { fecha as fmtFecha } from '../../lib/formatters';
import { mensajeIntegracion } from '../../lib/integrationErrors';
import styles from '../../styles/pages.module.css';
import m from '../../components/minutes/Minutes.module.css';

const limpiar = (xs) => (xs ?? []).map((x) => (typeof x === 'string' ? x.trim() : x)).filter(Boolean);

export default function MinutesPage() {
  const router = useRouter();
  const { meeting, setMeeting, isHydrated } = useMeeting();
  const [generando, setGenerando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState(null);
  const [confirmar, setConfirmar] = useState(false);
  const [revisada, setRevisada] = useState(false);

  if (!isHydrated || !meeting.id) return <NoActiveMeeting cargando={!isHydrated} />;
  const minuta = meeting.minutes;

  async function generar() {
    setGenerando(true);
    setError(null);
    try {
      const res = await fetch('/api/minutes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcription: meeting.transcription || meeting.notes || '',
          meetingData: { clientName: meeting.clientName, company: meeting.company, meetingDate: meeting.meetingDate, industry: meeting.industry, city: meeting.city, employees: meeting.employees },
          analysis: meeting.analysis,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw Object.assign(new Error(json.error || 'No se pudo generar la minuta'), { code: json.code });
      console.info(`[minuta] source=${json.source}${json.fallbackCode ? ` code=${json.fallbackCode}` : ''}`);
      setMeeting({
        minutes: json.minutes,
        minutesSource: json.source,
        minutesNote: json.source === 'demo' ? mensajeIntegracion('gemini', json.fallbackCode, json.fallbackReason) : '',
        minutesExportedAt: null,
      });
    } catch (e) {
      setError({ message: e.message, code: e.code });
    } finally {
      setGenerando(false);
    }
  }

  const editar = (cambio) => setMeeting({ minutes: { ...minuta, ...cambio } });

  const sinResponsable = (minuta?.tasks ?? []).filter((t) => !t.responsible).length;
  const sinFecha = (minuta?.tasks ?? []).filter((t) => !t.dueDate).length;
  const sinNombre = (minuta?.participants ?? []).filter((p) => !p.name).length;
  const pendientes = limpiar(minuta?.pendingItems).length;

  async function exportar() {
    setExportando(true);
    setError(null);
    try {
      const data = {
        ...minuta,
        topics: limpiar(minuta.topics),
        decisions: limpiar(minuta.decisions),
        agreements: limpiar(minuta.agreements),
        nextSteps: limpiar(minuta.nextSteps),
        pendingItems: limpiar(minuta.pendingItems),
        tasks: (minuta.tasks ?? []).filter((t) => t.description?.trim()),
        objective: [minuta.objective, meeting.meetingDate ? `Fecha de la reunión: ${fmtFecha(meeting.meetingDate)}.` : ''].filter(Boolean).join(' '),
      };
      await descargarWord('minutes', data, nombreArchivo('Minuta', meeting.company, meeting.meetingDate));
      setMeeting({ minutesExportedAt: new Date().toISOString() });
      setConfirmar(false);
      setRevisada(false);
    } catch (e) {
      setError({ message: e.message, code: 'DOCUMENT_GENERATION_FAILED' });
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className={styles.page}>
      <StepProgress actual="minutes" meeting={meeting} />
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.title}>Minuta de la reunión</h2>
          <p className={styles.subtitle}>Se arma solo con lo que se dijo en la conversación. Lo que no se mencionó queda marcado como “⚠ Sin confirmar” para que lo completes.</p>
        </div>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={generar} loading={generando} disabled={generando || !(meeting.transcription || meeting.notes)}>
            {minuta ? 'Volver a generar' : 'Generar minuta'}
          </Button>
          {minuta && <Button onClick={() => setConfirmar(true)}>Confirmar y exportar Word</Button>}
        </div>
      </div>

      {!(meeting.transcription || meeting.notes) && (
        <ErrorMessage message="No hay conversación para generar la minuta. Captúrala en el Copiloto." code="TRANSCRIPTION_EMPTY" />
      )}
      {meeting.minutesSource === 'demo' && minuta && (
        <ErrorMessage isDemoFallback message={`${meeting.minutesNote || 'Gemini no disponible.'} ${meeting.analysis ? 'Se armó con el análisis de esta reunión, sin IA: revisa y completa.' : 'Minuta de ejemplo.'}`} />
      )}
      {error && <ErrorMessage message={error.message} code={error.code} onDismiss={() => setError(null)} />}
      {meeting.minutesExportedAt && <p className={styles.muted}>✓ Exportada el {fmtFecha(meeting.minutesExportedAt)}.</p>}

      {!minuta ? (
        <Card padding="lg">
          <p className={styles.muted}>Pulsa <strong>Generar minuta</strong> para estructurar la reunión: objetivo, participantes, temas, decisiones, acuerdos, tareas y pendientes.</p>
        </Card>
      ) : (
        <>
          <Card>
            <h3 className={styles.cardTitle}>
              <span>Encabezado</span>
              <Badge variant={meeting.minutesSource === 'gemini' ? 'success' : 'warning'}>{meeting.minutesSource === 'gemini' ? 'Generada con Gemini' : 'DEMO · sin IA'}</Badge>
            </h3>
            <MinuteHeader minuta={minuta} fecha={meeting.meetingDate} onChange={editar} onFecha={(v) => setMeeting({ meetingDate: v })} />
          </Card>
          <Card>
            <h3 className={styles.cardTitle}>Contenido</h3>
            <MinuteSections minuta={minuta} onChange={editar} />
          </Card>
          <div className={styles.grid2}>
            <Card>
              <h3 className={styles.cardTitle}>Tareas</h3>
              <TaskTable tasks={minuta.tasks} onChange={(tasks) => editar({ tasks })} />
            </Card>
            <Card>
              <h3 className={styles.cardTitle}>Pendientes de confirmar</h3>
              <PendingItemsList items={minuta.pendingItems} onChange={(pendingItems) => editar({ pendingItems })} />
            </Card>
          </div>
          <div className={styles.actions} style={{ justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => router.push('/proposal')}>Ir a la propuesta →</Button>
          </div>
        </>
      )}

      {confirmar && minuta && (
        <div className={m.overlay} role="dialog" aria-modal="true" aria-labelledby="confirmar-titulo">
          <div className={m.modal}>
            <h3 id="confirmar-titulo">Antes de exportar</h3>
            <ul className={m.checklist}>
              <li><span className={sinNombre ? m.warn : m.ok}>{sinNombre ? '⚠' : '✓'}</span>{sinNombre ? `${sinNombre} participante(s) sin nombre` : 'Participantes con nombre'}</li>
              <li><span className={sinResponsable ? m.warn : m.ok}>{sinResponsable ? '⚠' : '✓'}</span>{sinResponsable ? `${sinResponsable} tarea(s) sin responsable` : 'Todas las tareas tienen responsable'}</li>
              <li><span className={sinFecha ? m.warn : m.ok}>{sinFecha ? '⚠' : '✓'}</span>{sinFecha ? `${sinFecha} tarea(s) sin fecha` : 'Todas las tareas tienen fecha'}</li>
              <li><span className={pendientes ? m.warn : m.ok}>{pendientes ? '⚠' : '✓'}</span>{pendientes ? `${pendientes} punto(s) pendientes de confirmar con el cliente` : 'Sin pendientes'}</li>
            </ul>
            <p className={styles.muted}>Lo que está sin confirmar aparecerá en el Word como “⚠ Sin asignar / Sin fecha”.</p>
            <label className={m.confirm}>
              <input type="checkbox" checked={revisada} onChange={(e) => setRevisada(e.target.checked)} />
              Revisé la minuta y confirmo que solo contiene información de la reunión.
            </label>
            <div className={m.modalActions}>
              <Button variant="ghost" onClick={() => setConfirmar(false)}>Cancelar</Button>
              <Button onClick={exportar} loading={exportando} disabled={!revisada || exportando}>Descargar Word</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
