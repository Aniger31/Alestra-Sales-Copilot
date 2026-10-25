/**
 * groqService.js — transcripción de audio con Groq Whisper.
 * Solo se ejecuta en el servidor (Next.js Route Handlers).
 * Nunca exponer GROQ_API_KEY al cliente.
 */

import Groq from 'groq-sdk';
import { ERROR_CODES, ERROR_MESSAGES } from '../lib/constants.js';

/** Instancia singleton — se crea una vez por proceso de servidor. */
let _client = null;

function getClient() {
  if (_client) return _client;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw crearError(ERROR_CODES.API_KEY_MISSING, ERROR_MESSAGES[ERROR_CODES.API_KEY_MISSING]);
  }

  _client = new Groq({ apiKey: apiKey.trim() });
  return _client;
}

/**
 * Transcribe un buffer de audio usando Groq Whisper.
 *
 * @param {Buffer|Uint8Array} audioBuffer  — contenido binario del audio
 * @param {string}            mimeType     — tipo MIME (ej. 'audio/webm')
 * @param {string}            [filename]   — nombre de archivo para Groq (incluye extensión)
 * @returns {Promise<{ text: string }>}
 * @throws {AppError}
 */
export async function transcribirAudio(audioBuffer, mimeType, filename) {
  const client = getClient();

  // Derivar extensión del mimeType si no se proveyó filename
  const ext = extensionDesdeMime(mimeType);
  const nombre = filename || `recording.${ext}`;

  // Groq SDK espera un objeto File-like. En Node.js 20+ existe File; como fallback usamos Blob.
  const blob = new Blob([audioBuffer], { type: mimeType });
  const file = new File([blob], nombre, { type: mimeType });

  let resultado;
  try {
    resultado = await client.audio.transcriptions.create({
      file,
      model: 'whisper-large-v3',
      language: 'es',
      response_format: 'json',
    });
  } catch (err) {
    throw mapearErrorGroq(err);
  }

  const text = resultado?.text?.trim() ?? '';
  if (!text) {
    throw crearError(
      ERROR_CODES.TRANSCRIPTION_EMPTY,
      ERROR_MESSAGES[ERROR_CODES.TRANSCRIPTION_EMPTY],
    );
  }

  return { text };
}

// ─── Utilidades privadas ───────────────────────────────────────────────────────

function extensionDesdeMime(mimeType) {
  const base = (mimeType || '').split(';')[0].trim().toLowerCase();
  const mapa = {
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/wav': 'wav',
    'audio/mp4': 'mp4',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
  };
  return mapa[base] ?? 'webm';
}

function mapearErrorGroq(err) {
  // Groq SDK lanza errores con propiedad `status` HTTP
  const status = err?.status ?? err?.statusCode ?? 0;
  if (status === 401 || status === 403) {
    return crearError(ERROR_CODES.API_KEY_INVALID, ERROR_MESSAGES[ERROR_CODES.API_KEY_INVALID], err);
  }
  if (status === 429) {
    return crearError(ERROR_CODES.QUOTA_EXCEEDED, ERROR_MESSAGES[ERROR_CODES.QUOTA_EXCEEDED], err);
  }
  if (status >= 500 || err?.code === 'ECONNREFUSED' || err?.code === 'ENOTFOUND') {
    return crearError(ERROR_CODES.SERVICE_UNAVAILABLE, ERROR_MESSAGES[ERROR_CODES.SERVICE_UNAVAILABLE], err);
  }
  return crearError(ERROR_CODES.NETWORK_ERROR, err?.message ?? ERROR_MESSAGES[ERROR_CODES.NETWORK_ERROR], err);
}

function crearError(code, message, cause) {
  const err = new Error(message);
  err.code = code;
  err.fallback = true; // señal para que el Route Handler active datos demo
  if (cause) err.cause = cause;
  return err;
}
