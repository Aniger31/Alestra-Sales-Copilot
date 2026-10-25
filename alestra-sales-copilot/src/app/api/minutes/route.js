/**
 * POST /api/minutes
 *
 * Genera una minuta estructurada a partir de una transcripción revisada.
 * Usa Gemini para redactar; activa datos de demo si la API no está disponible.
 *
 * Body (application/json):
 *   transcription  string   — texto revisado de la conversación (requerido)
 *   meetingData    object   — { clientName?, company?, meetingDate?, industry?, city?, employees? }
 *
 * Respuestas:
 *   200 { minutes: object, source: "gemini" | "demo" }
 *   400 { error: string, code: string }
 *   500 { error: string, code: string }
 */

import { generarMinuta } from '../../../services/geminiService.js';
import { MOCK_MINUTES } from '../../../lib/mockData.js';
import { ERROR_CODES } from '../../../lib/constants.js';
import { logInfo, logError } from '../../../lib/serverLog.js';

export const runtime = 'nodejs';

export async function POST(request) {
  // ── 1. Parsear y validar body ────────────────────────────────────────────────
  let body;
  try {
    body = await request.json();
  } catch {
    return respuestaError(400, 'INVALID_JSON', 'El cuerpo de la solicitud debe ser JSON válido.');
  }

  const { transcription, meetingData = {}, analysis = null } = body;

  if (!transcription || typeof transcription !== 'string' || transcription.trim().length < 10) {
    return respuestaError(
      400,
      ERROR_CODES.TRANSCRIPTION_EMPTY,
      'El campo "transcription" es requerido y debe tener al menos 10 caracteres.',
    );
  }

  // Sanitizar meetingData: solo campos esperados, sin pasar objetos arbitrarios a Gemini
  const datosReunion = {
    clientName: sanitizarCampo(meetingData.clientName),
    company:    sanitizarCampo(meetingData.company),
    meetingDate: sanitizarCampo(meetingData.meetingDate),
    industry:   sanitizarCampo(meetingData.industry),
    city:       sanitizarCampo(meetingData.city),
    employees:  sanitizarCampo(meetingData.employees),
  };

  // ── 2. Generar minuta con Gemini ─────────────────────────────────────────────
  let minuta;
  let source = 'gemini';
  let fallbackCode = '';
  let fallbackDetalle = '';
  const t0 = Date.now();

  try {
    minuta = await generarMinuta(transcription.trim(), datosReunion);
    logInfo('minutes', `Gemini OK en ${Date.now() - t0} ms`);
  } catch (err) {
    logError('minutes', `Gemini falló tras ${Date.now() - t0} ms → se usa demo`, err);
    fallbackCode = err.code ?? '';
    fallbackDetalle = err.message ?? '';
    if (err.fallback) {
      // Si llega el análisis de esta reunión, la minuta demo se arma con él;
      // si no, se usa la minuta de ejemplo personalizada con los datos de la reunión.
      minuta = analysis && typeof analysis === 'object'
        ? minutaDesdeAnalisis(analysis, datosReunion)
        : personalizarMinutaDemo(MOCK_MINUTES, datosReunion);
      source = 'demo';
    } else {
      return respuestaError(500, err.code ?? ERROR_CODES.NETWORK_ERROR, err.message);
    }
  }

  // ── 3. Respuesta ─────────────────────────────────────────────────────────────
  const respuesta = { minutes: minuta, source };

  if (source === 'demo') {
    respuesta.fallback = true;
    respuesta.fallbackReason = `API de Gemini no disponible — minuta de demostración. ${fallbackDetalle}`.trim();
    respuesta.fallbackCode = fallbackCode;
  }

  return Response.json(respuesta);
}

// ─── Utilidades privadas ───────────────────────────────────────────────────────

/** Trunca y limpia un campo de texto libre para evitar inyección en el prompt. */
function sanitizarCampo(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor).slice(0, 200).trim();
}

/**
 * Ajusta la minuta demo con los datos reales de la reunión cuando estén disponibles.
 * Solo sobreescribe campos que el usuario ya proporcionó — no inventa datos.
 */
function personalizarMinutaDemo(base, datosReunion) {
  const minuta = JSON.parse(JSON.stringify(base)); // copia profunda

  if (datosReunion.company) {
    minuta.title = `Minuta de Reunión Comercial — ${datosReunion.company}`;
  }
  if (datosReunion.meetingDate) {
    // Agregar fecha visible en los pendientes si no está
    if (!minuta.pendingItems.some((p) => p.includes('fecha'))) {
      minuta.pendingItems.unshift(`Fecha de reunión registrada: ${datosReunion.meetingDate}`);
    }
  }

  return minuta;
}

/**
 * Minuta de demostración construida SOLO con el análisis de esta reunión.
 * No inventa responsables ni fechas: quedan en null para que el vendedor los confirme.
 */
function minutaDesdeAnalisis(analisis, datosReunion) {
  const lista = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).slice(0, 8) : []);
  const empresa = datosReunion.company || 'Cliente';
  return {
    title: `Minuta de Reunión Comercial — ${empresa}`,
    objective: 'Levantar las necesidades del cliente y definir la solución preliminar con productos del catálogo.',
    participants: [
      { name: datosReunion.clientName || null, company: empresa, role: 'Cliente' },
      { name: null, company: 'Equipo comercial', role: 'Ejecutivo comercial' },
    ],
    topics: lista(analisis.needs).length ? lista(analisis.needs) : ['Necesidades del cliente'],
    summary: typeof analisis.summary === 'string' ? analisis.summary : '',
    decisions: [],
    agreements: [],
    tasks: lista(analisis.nextSteps).map((d) => ({ description: d, responsible: null, dueDate: null, status: 'pending' })),
    pendingItems: [...lista(analisis.missingInformation), 'Confirmar nombres de los participantes'],
    nextSteps: lista(analisis.nextSteps),
  };
}

function respuestaError(status, code, message) {
  return Response.json({ error: message, code }, { status });
}
