/**
 * audioUtils.js — utilidades de validación de archivos de audio.
 * Se puede usar tanto en cliente como en servidor.
 */

import { AUDIO_FORMATS_ALLOWED, AUDIO_MAX_SIZE_BYTES, ERROR_CODES } from './constants.js';

/**
 * Valida un Blob o File de audio.
 * @param {Blob|File} blob
 * @returns {{ valid: boolean, errorCode?: string }}
 */
export function validarAudio(blob) {
  if (!blob || blob.size === 0) {
    return { valid: false, errorCode: ERROR_CODES.AUDIO_EMPTY };
  }

  if (blob.size > AUDIO_MAX_SIZE_BYTES) {
    return { valid: false, errorCode: ERROR_CODES.AUDIO_TOO_LARGE };
  }

  // Normalizar el tipo MIME (quitar parámetros adicionales para comparación base)
  const mimeBase = blob.type ? blob.type.split(';')[0].trim().toLowerCase() : '';
  const mimeWithCodec = blob.type ? blob.type.trim().toLowerCase() : '';

  const formatosNormalizados = AUDIO_FORMATS_ALLOWED.map((f) =>
    f.split(';')[0].trim().toLowerCase()
  );

  if (
    mimeBase &&
    !formatosNormalizados.includes(mimeBase) &&
    !AUDIO_FORMATS_ALLOWED.some((f) => f.toLowerCase() === mimeWithCodec)
  ) {
    return { valid: false, errorCode: ERROR_CODES.AUDIO_FORMAT_INVALID };
  }

  return { valid: true };
}

/**
 * Convierte un Blob a ArrayBuffer para envío al servidor.
 * @param {Blob} blob
 * @returns {Promise<ArrayBuffer>}
 */
export async function blobToArrayBuffer(blob) {
  return blob.arrayBuffer();
}

/**
 * Devuelve el tamaño del blob en MB formateado.
 * @param {Blob} blob
 * @returns {string}
 */
export function formatAudioSize(blob) {
  if (!blob) return '0 MB';
  const mb = blob.size / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}
