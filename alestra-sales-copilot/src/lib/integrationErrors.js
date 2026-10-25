/**
 * integrationErrors.js — convierte los códigos de error de Groq/Gemini en mensajes
 * accionables para la UI (qué falló y qué hacer). Solo cliente.
 */

const ENV = { groq: 'GROQ_API_KEY', gemini: 'GEMINI_API_KEY' };
const NOMBRE = { groq: 'Groq (transcripción)', gemini: 'Gemini (análisis)' };

export function mensajeIntegracion(servicio, code, detalle = '') {
  const n = NOMBRE[servicio] ?? servicio;
  switch (code) {
    case 'API_KEY_MISSING':
      return `${n}: el servidor no ve ${ENV[servicio]}. Revisa que .env.local esté en la carpeta del proyecto (junto a package.json) y reinicia "npm run dev".`;
    case 'API_KEY_INVALID':
      return `${n}: la clave fue rechazada. Genera una nueva en la consola del proveedor, actualiza .env.local y reinicia el servidor.`;
    case 'QUOTA_EXCEEDED':
      return `${n}: se agotó la cuota gratuita o el límite por minuto. Espera un momento e intenta de nuevo.`;
    case 'SERVICE_UNAVAILABLE':
      return `${n}: ${detalle || 'servicio no disponible'}${servicio === 'gemini' ? ' Si dice "Modelo no disponible", cambia GEMINI_MODEL en .env.local.' : ''}`;
    case 'TRANSCRIPTION_EMPTY':
      return `${n}: el audio no tenía voz reconocible. Graba de nuevo hablando cerca del micrófono.`;
    case 'NETWORK_ERROR':
      return `${n}: no hubo conexión desde el servidor. ${detalle}`.trim();
    case 'AUDIO_EMPTY':
      return 'La grabación llegó vacía. Revisa que el micrófono no esté silenciado.';
    case 'AUDIO_FORMAT_INVALID':
      return 'Formato de audio no compatible con Whisper.';
    case 'AUDIO_TOO_LARGE':
      return 'La grabación es demasiado grande. Graba segmentos más cortos.';
    default:
      return detalle ? `${n}: ${detalle}` : `${n}: error desconocido.`;
  }
}
