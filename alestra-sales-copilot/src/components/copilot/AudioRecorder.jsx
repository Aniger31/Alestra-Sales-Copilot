/**
 * AudioRecorder — grabación con MediaRecorder y envío a POST /api/transcription.
 * Estados: idle → recording → processing → idle.
 *
 * Diagnóstico incluido (para saber si el micrófono capta voz):
 *  - selector de micrófono, medidor de nivel en vivo, duración y tamaño del segmento,
 *  - reproductor del último segmento (el audio vive solo en memoria del navegador),
 *  - bloquea el envío si la grabación dura < 1 s o fue silencio (Whisper inventa texto con silencio).
 *
 * Tamaño esperado: a 32 kbps (Opus) 10 s ≈ 40 KB y 1 min ≈ 240 KB. Un archivo pequeño no es error
 * por sí mismo; el medidor de nivel y la reproducción confirman si hay voz.
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import Button from '../ui/Button';
import ErrorMessage from '../ui/ErrorMessage';
import { validarAudio, formatAudioSize } from '../../lib/audioUtils';
import { AUDIO_MAX_DURATION_MINUTES, ERROR_MESSAGES } from '../../lib/constants';
import { mensajeIntegracion } from '../../lib/integrationErrors';
import styles from './Copilot.module.css';

const MAX_SEG = AUDIO_MAX_DURATION_MINUTES * 60;
const BITRATE = 32000;
const NIVEL_SILENCIO = 0.03; // pico RMS por debajo de esto = no se oyó voz
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export default function AudioRecorder({ onTranscribed, onError }) {
  const [estado, setEstado] = useState('idle'); // idle | recording | processing
  const [segundos, setSegundos] = useState(0);
  const [nivel, setNivel] = useState(0);
  const [error, setError] = useState(null);
  const [ultimo, setUltimo] = useState(null); // { url, duracion, tamano, tipo, pico }
  const [micros, setMicros] = useState([]);
  const [microId, setMicroId] = useState('');
  const refs = useRef({});

  useEffect(() => {
    listarMicros();
    return () => {
      liberar();
      if (refs.current.urlPrevia) URL.revokeObjectURL(refs.current.urlPrevia);
    };
  }, []);

  async function listarMicros() {
    try {
      const devs = await navigator.mediaDevices?.enumerateDevices?.();
      setMicros((devs ?? []).filter((d) => d.kind === 'audioinput'));
    } catch {
      // sin permisos todavía: se vuelve a listar después de grabar
    }
  }

  function liberar() {
    const r = refs.current;
    clearInterval(r.timer);
    cancelAnimationFrame(r.raf);
    r.stream?.getTracks().forEach((t) => t.stop());
    r.ctx?.close?.().catch(() => {});
    r.stream = null;
    r.ctx = null;
  }

  async function iniciar() {
    setError(null);
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder === 'undefined') {
      setError({ message: 'Este navegador no permite grabar audio (por ejemplo, Safari en iPhone). Escribe la conversación en el editor.' });
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: microId ? { exact: microId } : undefined, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (e) {
      const negado = e?.name === 'NotAllowedError' || e?.name === 'SecurityError';
      setError({
        message: negado
          ? 'Permiso de micrófono denegado. Actívalo en el candado de la barra de direcciones y recarga, o escribe la conversación.'
          : e?.name === 'NotFoundError' ? 'No se encontró ningún micrófono conectado.' : `No se pudo abrir el micrófono (${e?.name || 'error'}).`,
        code: negado ? 'MIC_DENIED' : 'MIC_ERROR',
      });
      return;
    }
    listarMicros();

    const tipo = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/webm', 'audio/mp4'].find((t) => MediaRecorder.isTypeSupported?.(t));
    const rec = new MediaRecorder(stream, tipo ? { mimeType: tipo, audioBitsPerSecond: BITRATE } : { audioBitsPerSecond: BITRATE });
    const partes = [];

    // Medidor de nivel (RMS) para confirmar que entra voz
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const an = ctx.createAnalyser();
    an.fftSize = 1024;
    ctx.createMediaStreamSource(stream).connect(an);
    const buf = new Float32Array(an.fftSize);
    let pico = 0;
    const medir = () => {
      an.getFloatTimeDomainData(buf);
      let s = 0;
      for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
      const rms = Math.sqrt(s / buf.length);
      pico = Math.max(pico, rms);
      setNivel(Math.min(1, rms * 4));
      refs.current.raf = requestAnimationFrame(medir);
    };

    rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) partes.push(e.data); };
    rec.onerror = (e) => setError({ message: `Error del grabador: ${e?.error?.name || 'desconocido'}` });
    rec.onstop = () => {
      // Se liberan las pistas DESPUÉS de recibir el último fragmento
      const duracion = (Date.now() - refs.current.inicio) / 1000;
      liberar();
      setNivel(0);
      const blob = new Blob(partes, { type: (rec.mimeType || tipo || 'audio/webm').split(';')[0] });
      procesar(blob, duracion, pico, rec.mimeType || tipo || 'audio/webm');
    };

    refs.current = { ...refs.current, rec, stream, ctx, inicio: Date.now() };
    refs.current.timer = setInterval(() => {
      const s = (Date.now() - refs.current.inicio) / 1000;
      setSegundos(s);
      if (s >= MAX_SEG) detener();
    }, 250);
    medir();
    rec.start(1000); // un fragmento por segundo
    setSegundos(0);
    setEstado('recording');
  }

  function detener() {
    const r = refs.current;
    clearInterval(r.timer);
    if (r.rec?.state === 'recording') {
      r.rec.requestData?.();
      r.rec.stop(); // onstop libera el micrófono y procesa
    }
    setEstado('processing');
  }

  async function procesar(blob, duracion, pico, mime) {
    if (refs.current.urlPrevia) URL.revokeObjectURL(refs.current.urlPrevia);
    const url = URL.createObjectURL(blob);
    refs.current.urlPrevia = url;
    const info = { url, duracion, tamano: formatAudioSize(blob), tipo: mime, pico };
    setUltimo(info);
    console.info(`[grabación] ${duracion.toFixed(1)} s · ${(blob.size / 1024).toFixed(1)} KB · ${mime} · nivel máx ${pico.toFixed(3)}`);

    if (duracion < 1) {
      fallar({ message: 'La grabación duró menos de 1 segundo. Pulsa Grabar, habla y luego Detener.', code: 'AUDIO_TOO_SHORT' });
      return;
    }
    if (pico < NIVEL_SILENCIO) {
      fallar({ message: 'No se detectó voz (el nivel del micrófono fue casi cero). Revisa que no esté silenciado o elige otro micrófono. Escucha el segmento abajo.', code: 'AUDIO_SILENT' });
      return;
    }
    const v = validarAudio(blob);
    if (!v.valid) {
      fallar({ message: ERROR_MESSAGES[v.errorCode], code: v.errorCode });
      return;
    }

    try {
      const ext = mime.includes('ogg') ? 'ogg' : mime.includes('mp4') ? 'mp4' : 'webm';
      const fd = new FormData();
      fd.append('audio', blob, `reunion-${Date.now()}.${ext}`);
      const res = await fetch('/api/transcription', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw Object.assign(new Error(json.error || 'No se pudo transcribir'), { code: json.code });
      if (json.source !== 'groq') {
        // La ruta responde 200 con source "demo" cuando Groq falla: se muestra el motivo real
        fallar({ message: mensajeIntegracion('groq', json.errorCode, json.error), code: json.errorCode || 'GROQ_FALLBACK' });
        return;
      }
      console.info(`[grabación] transcripción recibida: ${json.text.length} caracteres`);
      onTranscribed(json.text);
    } catch (e) {
      fallar({ message: e.message || ERROR_MESSAGES.NETWORK_ERROR, code: e.code });
    } finally {
      setEstado('idle');
    }
  }

  function fallar(err) {
    console.warn('[grabación] ✖', err.code, err.message);
    setError(err);
    onError?.(err);
    setEstado('idle');
  }

  const grabando = estado === 'recording';
  return (
    <div className={styles.recorder}>
      {micros.length > 1 && (
        <label className={styles.micSelect}>
          <span>Micrófono</span>
          <select value={microId} onChange={(e) => setMicroId(e.target.value)} disabled={grabando}>
            <option value="">Predeterminado del sistema</option>
            {micros.map((m, i) => <option key={m.deviceId || i} value={m.deviceId}>{m.label || `Micrófono ${i + 1}`}</option>)}
          </select>
        </label>
      )}
      <div className={styles.recRow}>
        {grabando ? (
          <Button variant="danger" onClick={detener} aria-label="Detener grabación">■ Detener</Button>
        ) : (
          <Button onClick={iniciar} loading={estado === 'processing'} disabled={estado === 'processing'}>
            {estado === 'processing' ? 'Transcribiendo…' : '● Grabar'}
          </Button>
        )}
        <span className={styles.recStatus} aria-live="polite">
          {grabando && <span className={styles.recDot} aria-hidden="true" />}
          {grabando
            ? `Grabando ${mmss(segundos)} / ${mmss(MAX_SEG)}`
            : estado === 'processing' ? 'Enviando a Groq Whisper…' : `Segmentos de hasta ${AUDIO_MAX_DURATION_MINUTES} min`}
        </span>
      </div>
      {grabando && (
        <div className={styles.meter} aria-label="Nivel del micrófono" role="meter" aria-valuenow={Math.round(nivel * 100)} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${Math.round(nivel * 100)}%`, background: nivel > 0.08 ? 'var(--color-success)' : 'var(--color-warning)' }} />
          <em>{nivel > 0.08 ? 'Se escucha voz' : 'Habla para ver el nivel'}</em>
        </div>
      )}
      {ultimo && !grabando && (
        <div className={styles.lastSeg}>
          <span>Último segmento: {mmss(ultimo.duracion)} · {ultimo.tamano} · {ultimo.tipo.split(';')[0]} · nivel máx. {Math.min(100, Math.round(ultimo.pico * 400))}%</span>
          <audio controls src={ultimo.url} preload="metadata" aria-label="Escuchar el último segmento grabado" />
        </div>
      )}
      {error && <ErrorMessage message={error.message} code={error.code} onDismiss={() => setError(null)} />}
    </div>
  );
}
