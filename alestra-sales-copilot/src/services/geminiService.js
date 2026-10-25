/**
 * geminiService.js — análisis comercial y generación de minutas con Google Gemini.
 * Solo se ejecuta en el servidor (Next.js Route Handlers).
 * Nunca exponer GEMINI_API_KEY al cliente.
 *
 * NOTA SOBRE EL MODELO:
 *   El modelo se lee de process.env.GEMINI_MODEL en tiempo de ejecución.
 *   Si la variable no está configurada, se usa el fallback 'gemini-1.5-flash'.
 *   Si el modelo no está disponible en la cuenta, la API devolverá 404 y se
 *   lanzará un error descriptivo — NO se asume disponibilidad silenciosa.
 */

import { GoogleGenAI } from '@google/genai';
import { extraerJSON, validarAnalisis, validarMinuta } from '../lib/validations.js';
import { ERROR_CODES, ERROR_MESSAGES, GEMINI_MODEL_FALLBACK, CATALOG_DISCLAIMER } from '../lib/constants.js';

/** Instancia singleton. */
let _client = null;

function getClient() {
  if (_client) return _client;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw crearError(ERROR_CODES.API_KEY_MISSING, ERROR_MESSAGES[ERROR_CODES.API_KEY_MISSING]);
  }

  _client = new GoogleGenAI({ apiKey: apiKey.trim() });
  return _client;
}

/**
 * Devuelve el identificador del modelo a usar.
 * Lee GEMINI_MODEL en runtime; usa fallback si no está configurado.
 */
function getModelo() {
  return (process.env.GEMINI_MODEL ?? '').trim() || GEMINI_MODEL_FALLBACK;
}

// ─── Prompts del sistema ───────────────────────────────────────────────────────

const SYSTEM_ANALISIS = `Eres un asistente de ventas B2B especializado en telecomunicaciones y servicios de TI empresariales.
Analiza la transcripción de una reunión comercial y extrae la información en el formato JSON indicado.

Reglas estrictas:
- No inventes productos, precios, fechas ni nombres de personas que no aparezcan en la conversación.
- No asumas información que no fue mencionada explícitamente.
- En compatibleProductSKUs incluye ÚNICAMENTE SKUs del catálogo proporcionado (formato SIM-XX-##).
- Si no hay información suficiente, devuelve listas vacías.
- Responde ÚNICAMENTE con el objeto JSON, sin texto adicional ni markdown.

${CATALOG_DISCLAIMER}`;

const SYSTEM_MINUTA = `Eres un asistente de ventas B2B que redacta minutas ejecutivas de reuniones comerciales.
Tu tarea es estructurar la información de una reunión en el formato JSON indicado.

Reglas estrictas:
- Usa SOLO la información presente en la transcripción.
- No inventes responsables, fechas ni acuerdos que no se mencionaron.
- Si un responsable o fecha no fue mencionado, usa null en el JSON.
- Responde ÚNICAMENTE con el objeto JSON, sin texto adicional ni markdown.

${CATALOG_DISCLAIMER}`;

// ─── Funciones exportadas ──────────────────────────────────────────────────────

/**
 * Analiza una transcripción de reunión comercial con Gemini.
 *
 * @param {string} transcripcion   — texto de la conversación
 * @param {string} [catalogoResumen] — extracto del catálogo para contexto (SKUs válidos)
 * @returns {Promise<object>}      — análisis validado y normalizado
 * @throws {AppError}
 */
export async function analizarConversacion(transcripcion, catalogoResumen = '') {
  if (!transcripcion || transcripcion.trim().length < 10) {
    throw crearError(
      ERROR_CODES.TRANSCRIPTION_EMPTY,
      ERROR_MESSAGES[ERROR_CODES.TRANSCRIPTION_EMPTY],
    );
  }

  const client = getClient();
  const modelo = getModelo();

  const esquemaRespuesta = JSON.stringify({
    summary: 'resumen breve de la conversación',
    needs: ['necesidad 1', 'necesidad 2'],
    technicalRequirements: ['requisito técnico 1'],
    commercialRequirements: ['requisito comercial 1'],
    missingInformation: ['información que falta 1'],
    suggestedQuestions: ['pregunta consultiva 1'],
    compatibleProductSKUs: ['SIM-XX-##'],
    nextSteps: ['paso siguiente 1'],
    opportunityType: 'estándar | configurable | a la medida | insuficiente',
  }, null, 2);

  const skusContext = catalogoResumen
    ? `\n\nSKUs válidos del catálogo (usa solo estos):\n${catalogoResumen}`
    : '';

  const prompt = `${SYSTEM_ANALISIS}${skusContext}

Transcripción de la reunión:
"""
${transcripcion.slice(0, 12000)}
"""

Responde con este JSON exacto (reemplaza los valores de ejemplo):
${esquemaRespuesta}`;

  const rawText = await llamarGemini(client, modelo, prompt);
  const parsed = extraerJSON(rawText);

  if (!parsed) {
    throw crearError(
      ERROR_CODES.GEMINI_INVALID_RESPONSE,
      `${ERROR_MESSAGES[ERROR_CODES.GEMINI_INVALID_RESPONSE]} Respuesta recibida: ${rawText?.slice(0, 200)}`,
    );
  }

  return validarAnalisis(parsed);
}

/**
 * Genera una minuta estructurada a partir de una transcripción revisada.
 *
 * @param {string} transcripcion  — texto revisado de la conversación
 * @param {object} [datosReunion] — metadata: clientName, company, meetingDate, etc.
 * @returns {Promise<object>}     — minuta validada y normalizada
 * @throws {AppError}
 */
export async function generarMinuta(transcripcion, datosReunion = {}) {
  if (!transcripcion || transcripcion.trim().length < 10) {
    throw crearError(
      ERROR_CODES.TRANSCRIPTION_EMPTY,
      ERROR_MESSAGES[ERROR_CODES.TRANSCRIPTION_EMPTY],
    );
  }

  const client = getClient();
  const modelo = getModelo();

  const esquemaRespuesta = JSON.stringify({
    title: 'Minuta de Reunión — Nombre del Cliente',
    objective: 'objetivo de la reunión',
    participants: [{ name: 'Nombre o null', company: 'Empresa', role: 'Rol' }],
    topics: ['tema tratado 1'],
    summary: 'resumen ejecutivo de la reunión',
    decisions: ['decisión tomada 1'],
    agreements: ['acuerdo alcanzado 1'],
    tasks: [{ description: 'tarea', responsible: null, dueDate: null, status: 'pending' }],
    pendingItems: ['elemento pendiente de confirmar 1'],
    nextSteps: ['próximo paso 1'],
  }, null, 2);

  const contextoReunion = datosReunion.company
    ? `\nDatos de la reunión: Cliente: ${datosReunion.clientName || 'No especificado'}, ` +
      `Empresa: ${datosReunion.company}, Fecha: ${datosReunion.meetingDate || 'No especificada'}.`
    : '';

  const prompt = `${SYSTEM_MINUTA}${contextoReunion}

Transcripción de la reunión:
"""
${transcripcion.slice(0, 12000)}
"""

Responde con este JSON exacto (reemplaza los valores de ejemplo):
${esquemaRespuesta}`;

  const rawText = await llamarGemini(client, modelo, prompt);
  const parsed = extraerJSON(rawText);

  if (!parsed) {
    throw crearError(
      ERROR_CODES.GEMINI_INVALID_RESPONSE,
      `${ERROR_MESSAGES[ERROR_CODES.GEMINI_INVALID_RESPONSE]} Respuesta recibida: ${rawText?.slice(0, 200)}`,
    );
  }

  return validarMinuta(parsed);
}

// ─── Utilidades privadas ───────────────────────────────────────────────────────

/**
 * Realiza la llamada a Gemini y devuelve el texto de la respuesta.
 * Centraliza el manejo de errores HTTP de la API.
 */
async function llamarGemini(client, modelo, prompt) {
  let respuesta;
  try {
    respuesta = await client.models.generateContent({
      model: modelo,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.2,       // baja temperatura para respuestas estructuradas
        // Los modelos Gemini 2.5+ pueden "pensar" y esos tokens cuentan contra este límite;
        // con 2048 el JSON podía salir cortado. responseMimeType fuerza JSON puro.
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    });
  } catch (err) {
    throw mapearErrorGemini(err, modelo);
  }

  // Extraer texto de la respuesta
  // response.text une las partes de texto (omite las de "pensamiento" de modelos 2.5+)
  const texto = respuesta?.text ?? respuesta?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return texto;
}

function mapearErrorGemini(err, modelo) {
  const status = err?.status ?? 0;
  const msg = err?.message ?? '';

  if (status === 401 || status === 403 || msg.includes('API key')) {
    return crearError(ERROR_CODES.API_KEY_INVALID, ERROR_MESSAGES[ERROR_CODES.API_KEY_INVALID], err);
  }
  if (status === 429 || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
    return crearError(ERROR_CODES.QUOTA_EXCEEDED, ERROR_MESSAGES[ERROR_CODES.QUOTA_EXCEEDED], err);
  }
  if (status === 404 || msg.includes('not found') || msg.includes('MODEL_NOT_FOUND')) {
    return crearError(
      ERROR_CODES.SERVICE_UNAVAILABLE,
      `Modelo '${modelo}' no disponible en esta cuenta. Verifica GEMINI_MODEL en .env.local.`,
      err,
    );
  }
  if (status >= 500 || err?.code === 'ECONNREFUSED' || err?.code === 'ENOTFOUND') {
    return crearError(ERROR_CODES.SERVICE_UNAVAILABLE, ERROR_MESSAGES[ERROR_CODES.SERVICE_UNAVAILABLE], err);
  }
  return crearError(ERROR_CODES.NETWORK_ERROR, msg || ERROR_MESSAGES[ERROR_CODES.NETWORK_ERROR], err);
}

function crearError(code, message, cause) {
  const err = new Error(message);
  err.code = code;
  err.fallback = true;
  if (cause) err.cause = cause;
  return err;
}
