/**
 * constants.js — constantes globales de la aplicación.
 * No importar en componentes cliente directamente si contienen lógica de servidor.
 */

// ===== Límites de audio =====
export const AUDIO_MAX_SIZE_MB = 24; // margen bajo el límite de 25MB de Groq
export const AUDIO_MAX_SIZE_BYTES = AUDIO_MAX_SIZE_MB * 1024 * 1024;
export const AUDIO_MAX_DURATION_MINUTES = 10;
export const AUDIO_FORMATS_ALLOWED = [
  'audio/webm',
  'audio/webm;codecs=opus',
  'audio/ogg',
  'audio/ogg;codecs=opus',
  'audio/wav',
  'audio/mp4',
  'audio/mpeg',
  'audio/mp3',
];

// ===== Modelo Gemini (fallback si GEMINI_MODEL no está configurado) =====
// IMPORTANTE: verificar disponibilidad real en AI Studio antes de usar.
// gemini-1.5-flash se apagó el 29-sep-2025 y gemini-2.0-flash el 1-jun-2026
// (https://ai.google.dev/gemini-api/docs/changelog). Google recomienda la familia 3.x Flash.
export const GEMINI_MODEL_FALLBACK = 'gemini-3.5-flash-lite';

// ===== Códigos de error normalizados =====
export const ERROR_CODES = {
  API_KEY_MISSING: 'API_KEY_MISSING',
  API_KEY_INVALID: 'API_KEY_INVALID',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  AUDIO_EMPTY: 'AUDIO_EMPTY',
  AUDIO_FORMAT_INVALID: 'AUDIO_FORMAT_INVALID',
  AUDIO_TOO_LARGE: 'AUDIO_TOO_LARGE',
  TRANSCRIPTION_EMPTY: 'TRANSCRIPTION_EMPTY',
  GEMINI_INVALID_RESPONSE: 'GEMINI_INVALID_RESPONSE',
  CATALOG_NO_MATCH: 'CATALOG_NO_MATCH',
  DOCUMENT_GENERATION_FAILED: 'DOCUMENT_GENERATION_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
};

// ===== Mensajes de error legibles =====
export const ERROR_MESSAGES = {
  [ERROR_CODES.API_KEY_MISSING]: 'API key no configurada. Revisar .env.local',
  [ERROR_CODES.API_KEY_INVALID]: 'API key inválida. Generar una nueva en la consola del proveedor.',
  [ERROR_CODES.QUOTA_EXCEEDED]: 'Cuota gratuita agotada. Mostrando datos de demostración.',
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 'Servicio temporalmente no disponible. Intenta de nuevo.',
  [ERROR_CODES.AUDIO_EMPTY]: 'El archivo de audio está vacío.',
  [ERROR_CODES.AUDIO_FORMAT_INVALID]: 'Formato de audio no compatible.',
  [ERROR_CODES.AUDIO_TOO_LARGE]: `El audio supera el límite de ${AUDIO_MAX_SIZE_MB} MB.`,
  [ERROR_CODES.TRANSCRIPTION_EMPTY]: 'La transcripción está vacía. Ingresa texto manualmente.',
  [ERROR_CODES.GEMINI_INVALID_RESPONSE]: 'Gemini devolvió una respuesta que no se pudo interpretar.',
  [ERROR_CODES.CATALOG_NO_MATCH]: 'No se encontraron productos compatibles en el catálogo.',
  [ERROR_CODES.DOCUMENT_GENERATION_FAILED]: 'No se pudo generar el documento Word.',
  [ERROR_CODES.NETWORK_ERROR]: 'Error de conexión. Verifica tu internet.',
};

// ===== Pasos del flujo principal =====
export const MEETING_STEPS = {
  MEETING: 'meeting',
  COPILOT: 'copilot',
  DIAGNOSIS: 'diagnosis',
  MINUTES: 'minutes',
  PROPOSAL: 'proposal',
};

export const MEETING_STEPS_ORDER = [
  MEETING_STEPS.MEETING,
  MEETING_STEPS.COPILOT,
  MEETING_STEPS.DIAGNOSIS,
  MEETING_STEPS.MINUTES,
  MEETING_STEPS.PROPOSAL,
];

// ===== Tipos de oportunidad del catálogo =====
export const OPPORTUNITY_TYPES = {
  STANDARD: 'estándar',
  CONFIGURABLE: 'configurable',
  MIXED: 'mixto',        // parte se cotiza hoy y parte la revisa un arquitecto (como en casos_clientes)
  CUSTOM: 'a la medida',
  INSUFFICIENT: 'insuficiente',
};

// ===== Fuentes de datos =====
export const DATA_SOURCES = {
  REAL: 'real',       // Resultado real de una API
  DEMO: 'demo',       // Datos ficticios de demostración
  MANUAL: 'manual',   // Ingresado manualmente por el usuario
};

// ===== Disclaimer legal del catálogo =====
export const CATALOG_DISCLAIMER =
  'Datos SIMULADOS para el Hackathon Alestra. No son productos, precios ni ' +
  'condiciones oficiales de Alestra. Esta propuesta no es una cotización oficial.';

// ===== Banner de modo demo =====
export const DEMO_MODE_BANNER =
  '⚠ MODO DEMOSTRACIÓN — Los datos mostrados son ficticios y no provienen de una API real. ' +
  'Configura las API keys en .env.local para usar integraciones reales.';
