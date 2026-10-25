/**
 * TranscriptionEditor — texto editable de la conversación, contador y botón Analizar.
 * Se recomienda el formato "Cliente: …" / "Vendedor: …": el análisis demo ignora las
 * líneas del vendedor para no confundir sus preguntas con necesidades del cliente.
 */
'use client';

import Button from '../ui/Button';
import Badge from '../ui/Badge';
import styles from './Copilot.module.css';

const FUENTE = {
  audio: { variant: 'success', texto: 'Groq Whisper' },
  manual: { variant: 'default', texto: 'Escrita a mano' },
  demo: { variant: 'warning', texto: 'Texto de ejemplo (DEMO)' },
};
const MAX = 12000; // geminiService recorta a 12,000 caracteres

export default function TranscriptionEditor({ value, onChange, source, onAnalyze, analyzing }) {
  const f = FUENTE[source];
  const insertar = (quien) => {
    const base = value.trim() ? `${value.replace(/\s+$/, '')}\n` : '';
    onChange(`${base}${quien}: `);
    setTimeout(() => {
      const ta = document.getElementById('transcripcion');
      ta?.focus();
      ta?.setSelectionRange(ta.value.length, ta.value.length);
    }, 0);
  };

  return (
    <div className={styles.editor}>
      <div className={styles.editorHead}>
        <label htmlFor="transcripcion" className={styles.label}>Conversación</label>
        {f && <Badge variant={f.variant}>{f.texto}</Badge>}
      </div>
      <textarea
        id="transcripcion"
        className={styles.textarea}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={12}
        maxLength={MAX}
        placeholder={'Cliente: Tenemos el servidor en un cuarto de la oficina y se nos fue la luz…\nVendedor: ¿Cuántos equipos son y cuánta energía consumen?'}
      />
      <div className={styles.editorFoot}>
        <div className={styles.quick}>
          <Button size="sm" variant="secondary" onClick={() => insertar('Cliente')}>+ Cliente</Button>
          <Button size="sm" variant="secondary" onClick={() => insertar('Vendedor')}>+ Vendedor</Button>
          <span className={value.length > MAX * 0.9 ? styles.countWarn : styles.count}>{value.length.toLocaleString('es-MX')} / {MAX.toLocaleString('es-MX')}</span>
        </div>
        <Button onClick={onAnalyze} loading={analyzing} disabled={analyzing || value.trim().length < 10}>
          {analyzing ? 'Analizando…' : 'Analizar conversación'}
        </Button>
      </div>
    </div>
  );
}
