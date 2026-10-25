/**
 * Copiloto — Tarea 6.
 * Flujo: Grabar (MediaRecorder) → POST /api/transcription (Groq Whisper) → texto editable
 *        → POST /api/analysis (Gemini + catálogo) → panel de Análisis.
 * Si una API falla, la ruta responde source:"demo" con un código de error; aquí se muestra
 * el motivo real (clave faltante, inválida, cuota…) en lugar de mezclar texto de ejemplo.
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMeeting } from '../../context/MeetingContext';
import Card from '../../components/ui/Card';
import ErrorMessage from '../../components/ui/ErrorMessage';
import StepProgress from '../../components/meeting/StepProgress';
import NoActiveMeeting from '../../components/meeting/NoActiveMeeting';
import AudioRecorder from '../../components/copilot/AudioRecorder';
import TranscriptionEditor from '../../components/copilot/TranscriptionEditor';
import AnalysisPanel from '../../components/copilot/AnalysisPanel';
import IntegrationStatus from '../../components/copilot/IntegrationStatus';
import { mensajeIntegracion } from '../../lib/integrationErrors';
import styles from '../../styles/pages.module.css';

const esTextoDemo = (t) => typeof t === 'string' && t.trimStart().startsWith('[DEMO]');

export default function CopilotPage() {
  const router = useRouter();
  const { meeting, setMeeting, isHydrated } = useMeeting();
  const [texto, setTexto] = useState('');
  const [fuente, setFuente] = useState(null);
  const [cargadoDe, setCargadoDe] = useState(null); // id de la reunión cuyo texto ya se cargó
  const [analizando, setAnalizando] = useState(false);
  const [error, setError] = useState(null);

  // Cargar la transcripción de ESTA reunión. Se ignora cualquier texto [DEMO] guardado antes.
  useEffect(() => {
    if (!isHydrated || !meeting.id || cargadoDe === meeting.id) return;
    if (meeting.transcription && !esTextoDemo(meeting.transcription)) {
      setTexto(meeting.transcription);
      setFuente(meeting.transcriptionSource === 'demo' ? 'manual' : meeting.transcriptionSource);
    } else {
      setTexto(meeting.notes?.trim() ? `Cliente: ${meeting.notes.trim()}` : '');
      setFuente(meeting.notes?.trim() ? 'manual' : null);
      if (esTextoDemo(meeting.transcription)) setMeeting({ transcription: '', transcriptionSource: null });
    }
    setCargadoDe(meeting.id);
  }, [isHydrated, meeting.id, meeting.transcription, meeting.transcriptionSource, meeting.notes, cargadoDe, setMeeting]);

  if (!isHydrated || !meeting.id) return <NoActiveMeeting cargando={!isHydrated} />;

  function cambiarTexto(v) {
    setTexto(v);
    setFuente((f) => (f === 'audio' ? 'audio' : 'manual'));
    setMeeting({ transcription: v, transcriptionSource: fuente === 'audio' ? 'audio' : 'manual' });
  }

  function alTranscribir(textoAudio) {
    const nuevo = texto.trim() ? `${texto.trim()}\nCliente: ${textoAudio}` : `Cliente: ${textoAudio}`;
    setTexto(nuevo);
    setFuente('audio');
    setMeeting({ transcription: nuevo, transcriptionSource: 'audio' });
  }

  async function analizar() {
    setAnalizando(true);
    setError(null);
    try {
      const res = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcription: texto,
          meetingData: { clientName: meeting.clientName, company: meeting.company, industry: meeting.industry, employees: meeting.employees },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw Object.assign(new Error(json.error || 'No se pudo analizar la conversación'), { code: json.code });
      console.info(`[análisis] source=${json.source}${json.fallbackCode ? ` code=${json.fallbackCode}` : ''} · ${json.products?.length ?? 0} productos`);

      // Un producto por usuario con mínimo mayor al tamaño de la empresa no aplica (ej. E3 pide 300).
      const empleados = Number(meeting.employees) || 0;
      const descartados = [];
      const productos = (json.products ?? []).filter((p) => {
        const fuera = empleados && p.unidad_cobro === 'por usuario al mes' && p.cantidad_minima > empleados;
        if (fuera) descartados.push(`${p.nombre} (mínimo ${p.cantidad_minima})`);
        return !fuera;
      });
      const cantidades = Object.fromEntries(Object.entries(meeting.quantities ?? {}).filter(([sku]) => productos.some((p) => p.sku === sku)));
      const nota = [
        json.source === 'demo' ? mensajeIntegracion('gemini', json.fallbackCode, json.fallbackReason) : '',
        descartados.length ? `Descartado por tamaño de la empresa: ${descartados.join(', ')}.` : '',
      ].filter(Boolean).join(' ');

      setMeeting({
        transcription: texto,
        transcriptionSource: fuente ?? 'manual',
        analysis: json.analysis,
        analysisSource: json.source,
        analysisNote: nota,
        analysisAt: new Date().toISOString(),
        recommendedProducts: productos,
        recommendedPackages: json.packages ?? [],
        escalationRequired: json.escalation?.requiere ?? false,
        escalationReasons: json.escalation?.razones ?? [],
        detectedFacts: json.facts ?? {},
        opportunityType: json.opportunityType,
        quantities: cantidades,
        step: 'diagnosis',
      });
    } catch (e) {
      setError({ message: e.message, code: e.code });
    } finally {
      setAnalizando(false);
    }
  }

  return (
    <div className={styles.page}>
      <StepProgress actual="copilot" meeting={meeting} />
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.title}>Copiloto de la reunión</h2>
          <p className={styles.subtitle}>Graba segmentos o escribe lo que dice el cliente. El análisis propone productos del catálogo y te dice qué preguntar para cerrar el levantamiento en esta sesión.</p>
        </div>
      </div>

      {meeting.analysisSource === 'demo' && meeting.analysisNote && (
        <ErrorMessage isDemoFallback message={meeting.analysisNote} />
      )}

      <div className={styles.grid2}>
        <div className={styles.stack}>
          <Card>
            <h3 className={styles.cardTitle}>Grabación</h3>
            <AudioRecorder onTranscribed={alTranscribir} />
          </Card>
          <Card>
            <TranscriptionEditor value={texto} onChange={cambiarTexto} source={fuente} onAnalyze={analizar} analyzing={analizando} />
            {error && <div style={{ marginTop: 'var(--spacing-3)' }}><ErrorMessage message={error.message} code={error.code} onDismiss={() => setError(null)} /></div>}
          </Card>
          <Card>
            <h3 className={styles.cardTitle}>Integraciones</h3>
            <IntegrationStatus />
          </Card>
        </div>

        <Card>
          <h3 className={styles.cardTitle}>Análisis</h3>
          <AnalysisPanel
            analysis={meeting.analysis}
            products={meeting.recommendedProducts}
            opportunityType={meeting.opportunityType}
            source={meeting.analysisSource}
            escalationRequired={meeting.escalationRequired}
            onContinue={() => router.push('/diagnosis')}
          />
        </Card>
      </div>
    </div>
  );
}
