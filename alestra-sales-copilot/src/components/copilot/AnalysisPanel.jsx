/**
 * AnalysisPanel — resultado del análisis: necesidades, requisitos, preguntas sugeridas,
 * información faltante, productos del catálogo y siguientes pasos.
 */
'use client';

import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { TIPO_OPORTUNIDAD } from '../../lib/formatters';
import styles from './Copilot.module.css';

function Lista({ titulo, items, icono = '•', destacada }) {
  if (!items?.length) return null;
  return (
    <section className={[styles.block, destacada ? styles.blockHot : ''].filter(Boolean).join(' ')}>
      <h3 className={styles.blockTitle}>{titulo}</h3>
      <ul className={styles.list}>
        {items.map((x, i) => (
          <li key={i}><span aria-hidden="true">{icono}</span><span>{typeof x === 'string' ? x : JSON.stringify(x)}</span></li>
        ))}
      </ul>
    </section>
  );
}

export default function AnalysisPanel({ analysis, products = [], opportunityType, source, escalationRequired, onContinue }) {
  if (!analysis) {
    return (
      <div className={styles.empty}>
        <p><strong>Aún no hay análisis.</strong></p>
        <p>Graba o escribe la conversación y pulsa <em>Analizar conversación</em>. Verás las necesidades, lo que falta preguntar y los productos del catálogo que aplican.</p>
      </div>
    );
  }
  const t = TIPO_OPORTUNIDAD[opportunityType] ?? TIPO_OPORTUNIDAD.insuficiente;
  return (
    <div className={styles.analysis}>
      <div className={styles.analysisHead}>
        <Badge variant={source === 'gemini' ? 'success' : 'warning'}>{source === 'gemini' ? 'Analizado con Gemini' : 'DEMO · sin IA'}</Badge>
        <Badge variant={t.variant}>{t.etiqueta}</Badge>
        {escalationRequired && <Badge variant="accent">Requiere arquitecto</Badge>}
      </div>
      {analysis.summary && <p className={styles.summary}>{analysis.summary}</p>}

      <Lista titulo="Pregunta ahora para cerrar en una sesión" items={analysis.suggestedQuestions} icono="?" destacada />
      <Lista titulo="Información que falta" items={analysis.missingInformation} icono="⚠" />
      <Lista titulo="Necesidades detectadas" items={analysis.needs} icono="✓" />
      <Lista titulo="Requisitos técnicos" items={analysis.technicalRequirements} />
      <Lista titulo="Requisitos comerciales" items={analysis.commercialRequirements} />

      {products.length > 0 && (
        <section className={styles.block}>
          <h3 className={styles.blockTitle}>Productos del catálogo ({products.length})</h3>
          <div className={styles.chips}>
            {products.map((p) => <span key={p.sku} className={styles.chip} title={p.nombre}><code>{p.sku}</code> {p.nombre}</span>)}
          </div>
        </section>
      )}
      <Lista titulo="Siguientes pasos" items={analysis.nextSteps} icono="→" />

      <div className={styles.analysisFoot}>
        <Button onClick={onContinue}>Ver diagnóstico →</Button>
      </div>
    </div>
  );
}
