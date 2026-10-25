/**
 * POST /api/analysis
 *
 * Analiza una transcripción de reunión con Gemini y valida los SKUs contra el catálogo.
 * Ningún producto, SKU ni precio es inventado — se cruzan contra catalog.json.
 *
 * Body (application/json):
 *   transcription  string   — texto de la conversación (requerido, mín. 10 chars)
 *   meetingData    object   — { clientName?, company?, meetingDate?, ... } (opcional)
 *
 * Respuestas:
 *   200 {
 *         analysis: object,          — análisis validado de Gemini
 *         products: object[],        — productos reales del catálogo (no inventados)
 *         packages: object[],        — paquetes compatibles del catálogo
 *         escalation: object,        — { requiere, razones }
 *         opportunityType: string,   — tipo de oportunidad determinado por catálogo
 *         source: "gemini" | "demo"
 *       }
 *   400 { error: string, code: string }
 *   500 { error: string, code: string }
 */

import { analizarConversacion } from '../../../services/geminiService.js';
import {
  obtenerProductosPorSKUs,
  obtenerPaquetesCompatibles,
  evaluarEscalamiento,
  determinarTipoOportunidad,
  construirContextoCatalogo,
  obtenerCatalogo,
} from '../../../services/catalogService.js';
import { analizarSinIA, detectarHechos } from '../../../lib/demoAnalysis.js';
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

  const { transcription, meetingData = {} } = body;

  if (!transcription || typeof transcription !== 'string' || transcription.trim().length < 10) {
    return respuestaError(400, ERROR_CODES.TRANSCRIPTION_EMPTY, 'El campo "transcription" es requerido y debe tener al menos 10 caracteres.');
  }

  // ── 2. Construir contexto del catálogo para Gemini ───────────────────────────
  // Solo SKUs y nombres — sin precios, para que Gemini no los modifique
  let catalogoResumen;
  try {
    catalogoResumen = construirContextoCatalogo();
  } catch (err) {
    return respuestaError(500, 'CATALOG_ERROR', `Error al cargar el catálogo: ${err.message}`);
  }

  // ── 3. Analizar con Gemini ───────────────────────────────────────────────────
  let analisis;
  let source = 'gemini';
  let fallbackReason = '';
  let fallbackCode = '';
  const t0 = Date.now();
  logInfo('analysis', `analizando ${transcription.trim().length} caracteres (modelo ${process.env.GEMINI_MODEL?.trim() || 'por defecto'})`);

  try {
    analisis = await analizarConversacion(transcription.trim(), catalogoResumen);
    logInfo('analysis', `Gemini OK en ${Date.now() - t0} ms · ${analisis.compatibleProductSKUs.length} SKU sugeridos`);
  } catch (err) {
    logError('analysis', `Gemini falló tras ${Date.now() - t0} ms → se usa demo`, err);
    fallbackCode = err.code ?? '';
    if (err.fallback) {
      // Demo basado en ESTA conversación (antes: siempre el caso Aceros del Valle)
      analisis = analizarSinIA(transcription, obtenerCatalogo());
      source = 'demo';
      fallbackReason = err.message;
    } else {
      return respuestaError(500, err.code ?? ERROR_CODES.NETWORK_ERROR, err.message);
    }
  }

  // ── 4. Validar y enriquecer SKUs desde el catálogo real ─────────────────────
  // Solo devolver productos que existen en catalog.json — nunca inventados por Gemini
  const skusSugeridos = analisis.compatibleProductSKUs ?? [];
  let productosReales = [];
  let paquetes = [];
  let escalamiento = { requiere: false, razones: [], reglas: [], revisar: [] };
  let tipoOportunidad = 'insuficiente';
  // Hechos que activan reglas de escalamiento (regulación, Oracle, híbrido…). El vendedor los confirma en Diagnóstico.
  const hechos = detectarHechos(transcription);

  try {
    productosReales = obtenerProductosPorSKUs(skusSugeridos);
    if (productosReales.length < skusSugeridos.length) {
      logInfo('analysis', `${skusSugeridos.length - productosReales.length} SKU descartado(s) por no existir en el catálogo`);
    }
    // Si Gemini sugirió SKUs que no existen, solo se conservan los válidos
    analisis.compatibleProductSKUs = productosReales.map((p) => p.sku);

    paquetes = obtenerPaquetesCompatibles(analisis.compatibleProductSKUs);
    escalamiento = evaluarEscalamiento(analisis.compatibleProductSKUs, {
      totalUsuarios: extraerNumero(transcription, /(\d+)\s*usuarios/i),
      presupuestoMensual: extraerNumero(transcription, /\$\s*([\d,]+)/),
      hechos,
    });
    tipoOportunidad = determinarTipoOportunidad(productosReales, escalamiento);
    analisis.opportunityType = tipoOportunidad;
  } catch (err) {
    // El catálogo es local — si falla aquí es un error de código, no de API
    return respuestaError(500, 'CATALOG_ERROR', `Error al procesar el catálogo: ${err.message}`);
  }

  // ── 5. Respuesta ─────────────────────────────────────────────────────────────
  const respuesta = {
    analysis: analisis,
    products: productosReales,
    packages: paquetes,
    escalation: {
      requiere: escalamiento.requiere,
      razones: escalamiento.razones,
      reglas: escalamiento.reglas,
      revisar: escalamiento.revisar,
    },
    facts: hechos,
    opportunityType: tipoOportunidad,
    source,
  };

  // Si se usó demo, indicarlo explícitamente en la respuesta
  if (source === 'demo') {
    respuesta.fallback = true;
    respuesta.fallbackReason = `API de Gemini no disponible — análisis de demostración por palabras clave. ${fallbackReason}`.trim();
    respuesta.fallbackCode = fallbackCode;
  }

  return Response.json(respuesta);
}

// ─── Utilidades privadas ───────────────────────────────────────────────────────

/**
 * Intenta extraer un número de un texto con una regex.
 * Devuelve 0 si no encuentra nada.
 */
function extraerNumero(texto, regex) {
  const match = texto.match(regex);
  if (!match) return 0;
  // Eliminar comas de miles antes de parsear
  return Number((match[1] ?? '0').replace(/,/g, '')) || 0;
}

function respuestaError(status, code, message) {
  return Response.json({ error: message, code }, { status });
}
