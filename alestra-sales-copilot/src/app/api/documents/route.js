/**
 * POST /api/documents
 *
 * Genera un documento Word (.docx) a partir de una minuta o propuesta confirmada.
 * Devuelve el archivo binario descargable.
 *
 * Body (application/json):
 *   type      string  — "minutes" | "proposal" (requerido)
 *   data      object  — minuta o propuesta validada (requerido)
 *
 * Respuestas:
 *   200  application/vnd.openxmlformats-officedocument.wordprocessingml.document
 *   400  { error: string, code: string }
 *   500  { error: string, code: string }
 */

import { generarDocumentoWord, generarDocumentoPropuesta } from '../../../services/documentService.js';
import { obtenerCatalogo } from '../../../services/catalogService.js';
import { calcularPropuesta } from '../../../lib/commercialRules.js';
import { ERROR_CODES } from '../../../lib/constants.js';
import { logInfo, logError } from '../../../lib/serverLog.js';

export const runtime = 'nodejs';

export async function POST(request) {
  // ── 1. Parsear body ──────────────────────────────────────────────────────────
  let body;
  try {
    body = await request.json();
  } catch {
    return respuestaError(400, 'INVALID_JSON', 'El cuerpo de la solicitud debe ser JSON válido.');
  }

  const { type, data } = body;

  // ── 2. Validar tipo y datos ──────────────────────────────────────────────────
  if (!type || !['minutes', 'proposal'].includes(type)) {
    return respuestaError(
      400,
      'INVALID_PARAM',
      'El campo "type" es requerido. Valores permitidos: "minutes", "proposal".',
    );
  }

  if (!data || typeof data !== 'object') {
    return respuestaError(400, 'INVALID_PARAM', 'El campo "data" es requerido y debe ser un objeto.');
  }

  // ── 3. Validaciones mínimas por tipo ─────────────────────────────────────────
  if (type === 'minutes') {
    if (!data.title && !data.summary) {
      return respuestaError(
        400,
        'INVALID_PARAM',
        'La minuta debe tener al menos "title" o "summary".',
      );
    }
  }

  if (type === 'proposal') {
    if (!data.titulo && !data.resumen) {
      return respuestaError(
        400,
        'INVALID_PARAM',
        'La propuesta debe tener al menos "titulo" o "resumen".',
      );
    }
  }

  // ── 4. Generar documento ─────────────────────────────────────────────────────
  let buffer;
  try {
    if (type === 'minutes') {
      buffer = await generarDocumentoWord(data);
    } else {
      // Recalcular la propuesta en el servidor con el catálogo: no se confía en precios
      // ni totales enviados por el navegador, solo en SKUs, cantidades y plazo.
      let propuesta = data;
      if (Array.isArray(data.lineas) && data.lineas.length > 0) {
        const calculo = calcularPropuesta(obtenerCatalogo(), {
          lineas: data.lineas.map((l) => ({ sku: String(l.sku ?? ''), cantidad: l.cantidad ?? null, parametros: l.parametros ?? {} })),
          plazoMeses: data.plazoMeses ?? 12,
          hechos: data.hechos ?? {},
          fecha: data.fecha,
        });
        propuesta = { ...data, calculo };
      }
      buffer = await generarDocumentoPropuesta(propuesta);
    }
  } catch (err) {
    logError('documents', `no se pudo generar ${type}`, err);
    return respuestaError(
      500,
      err.code ?? ERROR_CODES.DOCUMENT_GENERATION_FAILED,
      'No se pudo generar el documento. Inténtalo de nuevo.',
      // No exponer err.message al cliente para evitar revelar detalles internos
    );
  }

  // ── 5. Devolver archivo descargable ──────────────────────────────────────────
  const filename = type === 'minutes' ? 'minuta-reunion.docx' : 'propuesta-comercial.docx';
  logInfo('documents', `${filename} generado (${(buffer.length / 1024).toFixed(1)} KB)`);

  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length.toString(),
    },
  });
}

// CORRECCIÓN: esta función se usaba arriba pero no existía (ReferenceError → HTTP 500
// en cualquier error de validación).
function respuestaError(status, code, message) {
  return Response.json({ error: message, code }, { status });
}
