/**
 * POST /api/transcription
 *
 * Recibe un archivo de audio en FormData, lo valida y lo transcribe con Groq Whisper.
 * Devuelve { text, source } donde source indica si el resultado es real o demo.
 *
 * Body (multipart/form-data):
 *   audio  File   — archivo de audio (webm, ogg, wav, mp4, mp3)
 *
 * Respuestas:
 *   200 { text: string, source: "groq" }
 *   200 { text: string, source: "demo", fallback: true, error: string }
 *   400 { error: string, code: string }
 *   500 { error: string, code: string }
 */

import { transcribirAudio } from '../../../services/groqService.js';
import { validarAudio } from '../../../lib/audioUtils.js';
import { MOCK_TRANSCRIPTION } from '../../../lib/mockData.js';
import { ERROR_CODES, ERROR_MESSAGES, AUDIO_MAX_SIZE_MB } from '../../../lib/constants.js';
import { logInfo, logError, kb } from '../../../lib/serverLog.js';

export const runtime = 'nodejs';

export async function POST(request) {
  // ── 1. Parsear FormData ──────────────────────────────────────────────────────
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return respuestaError(400, ERROR_CODES.AUDIO_FORMAT_INVALID, 'Solicitud inválida: se esperaba multipart/form-data.');
  }

  const audioFile = formData.get('audio');
  if (!audioFile || typeof audioFile === 'string') {
    return respuestaError(400, ERROR_CODES.AUDIO_EMPTY, 'Campo "audio" ausente o vacío en el formulario.');
  }

  // ── 2. Validar el archivo ────────────────────────────────────────────────────
  logInfo('transcription', `audio recibido: ${kb(audioFile.size)} · ${audioFile.type || 'sin tipo'} · ${audioFile.name || 'sin nombre'}`);
  const validacion = validarAudio(audioFile);
  if (!validacion.valid) {
    logError('transcription', 'audio rechazado', { code: validacion.errorCode, message: '' });
    const mensajes = {
      [ERROR_CODES.AUDIO_EMPTY]: 'El archivo de audio está vacío.',
      [ERROR_CODES.AUDIO_TOO_LARGE]: `El archivo supera el límite de ${AUDIO_MAX_SIZE_MB} MB.`,
      [ERROR_CODES.AUDIO_FORMAT_INVALID]: `Formato de audio no compatible. Formatos permitidos: webm, ogg, wav, mp4, mp3.`,
    };
    return respuestaError(400, validacion.errorCode, mensajes[validacion.errorCode] ?? 'Archivo de audio inválido.');
  }

  // ── 3. Convertir a Buffer ────────────────────────────────────────────────────
  let audioBuffer;
  try {
    audioBuffer = Buffer.from(await audioFile.arrayBuffer());
  } catch {
    return respuestaError(500, ERROR_CODES.NETWORK_ERROR, 'Error al leer el archivo de audio.');
  }

  // ── 4. Transcribir con Groq ──────────────────────────────────────────────────
  const t0 = Date.now();
  try {
    const resultado = await transcribirAudio(audioBuffer, audioFile.type, audioFile.name);
    logInfo('transcription', `Groq OK: ${resultado.text.length} caracteres en ${Date.now() - t0} ms`);
    return Response.json({ text: resultado.text, source: 'groq' });
  } catch (err) {
    logError('transcription', `Groq falló tras ${Date.now() - t0} ms`, err);
    // Si el error indica que se debe usar fallback (cuota, key faltante, etc.)
    if (err.fallback) {
      return Response.json(
        {
          text: MOCK_TRANSCRIPTION,
          source: 'demo',
          fallback: true,
          error: err.message,
          errorCode: err.code,
        },
        { status: 200 }, // 200 para que el frontend no rompa; el campo source='demo' lo identifica
      );
    }
    return respuestaError(500, err.code ?? ERROR_CODES.NETWORK_ERROR, err.message);
  }
}


function respuestaError(status, code, message) {
  return Response.json({ error: message, code }, { status });
}
