/**
 * serverLog.js — logs claros en la terminal de `npm run dev` (solo servidor).
 * Nunca registrar claves API ni el contenido de las conversaciones: solo tamaños,
 * tiempos, modelos y códigos de error.
 */

const ts = () => new Date().toISOString().slice(11, 19);

export function logInfo(scope, msg, extra) {
  console.info(`[${ts()}] [${scope}] ${msg}`, extra !== undefined ? extra : '');
}

export function logError(scope, msg, err) {
  const detalle = err ? `${err.code ?? ''} ${err.message ?? ''}`.trim() : '';
  console.error(`[${ts()}] [${scope}] ✖ ${msg}${detalle ? ` → ${detalle}` : ''}`);
}

export const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
