/**
 * GET /api/status            → qué integraciones ve configuradas el SERVIDOR (sin exponer claves)
 * GET /api/status?probar=1   → además hace una llamada mínima a Gemini y a Groq para validar las claves
 *
 * Sirve para diagnosticar el "MODO DEMOSTRACIÓN": si aquí sale configured=false,
 * el servidor no está leyendo .env.local (carpeta equivocada, archivo .env.local.txt,
 * o no se reinició `npm run dev` después de editarlo).
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { GoogleGenAI } from '@google/genai';
import Groq from 'groq-sdk';
import { GEMINI_MODEL_FALLBACK } from '../../../lib/constants.js';
import { logInfo, logError } from '../../../lib/serverLog.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const limpio = (v) => (typeof v === 'string' ? v.trim() : '');

export async function GET(request) {
  const probar = new URL(request.url).searchParams.get('probar') === '1';
  const cwd = process.cwd();
  const geminiKey = limpio(process.env.GEMINI_API_KEY);
  const groqKey = limpio(process.env.GROQ_API_KEY);
  const modelo = limpio(process.env.GEMINI_MODEL) || GEMINI_MODEL_FALLBACK;

  const estado = {
    envFile: {
      carpeta: cwd,
      existeEnvLocal: existsSync(join(cwd, '.env.local')),
      // En Windows el Bloc de notas puede guardar ".env.local.txt" sin que se note
      existeEnvLocalTxt: existsSync(join(cwd, '.env.local.txt')),
    },
    gemini: {
      configurada: geminiKey.length > 0,
      // Solo forma de la clave, nunca su valor
      formatoValido: geminiKey.length === 0 ? null : /^AIza[0-9A-Za-z_-]{20,}$/.test(geminiKey),
      modelo,
      modeloDesdeEnv: limpio(process.env.GEMINI_MODEL).length > 0,
    },
    groq: {
      configurada: groqKey.length > 0,
      formatoValido: groqKey.length === 0 ? null : /^gsk_[0-9A-Za-z]{20,}$/.test(groqKey),
      modelo: 'whisper-large-v3',
    },
  };

  if (probar) {
    estado.gemini.prueba = geminiKey ? await probarGemini(geminiKey, modelo) : { ok: false, code: 'API_KEY_MISSING', mensaje: 'GEMINI_API_KEY vacía en el servidor.' };
    estado.groq.prueba = groqKey ? await probarGroq(groqKey) : { ok: false, code: 'API_KEY_MISSING', mensaje: 'GROQ_API_KEY vacía en el servidor.' };
  }

  logInfo('status', `gemini=${estado.gemini.configurada ? 'sí' : 'NO'} (${modelo}) groq=${estado.groq.configurada ? 'sí' : 'NO'} .env.local=${estado.envFile.existeEnvLocal ? 'sí' : 'NO'}${probar ? ` · prueba gemini=${estado.gemini.prueba.ok} groq=${estado.groq.prueba.ok}` : ''}`);
  return Response.json(estado, { headers: { 'Cache-Control': 'no-store' } });
}

async function probarGemini(apiKey, modelo) {
  const t0 = Date.now();
  try {
    const ai = new GoogleGenAI({ apiKey });
    const r = await ai.models.generateContent({ model: modelo, contents: 'Responde solo: OK', config: { maxOutputTokens: 20, temperature: 0 } });
    return { ok: true, ms: Date.now() - t0, mensaje: `Respondió el modelo ${modelo}.`, respuesta: String(r?.text ?? '').slice(0, 20) };
  } catch (err) {
    logError('status', `prueba Gemini (${modelo})`, err);
    return { ok: false, ...clasificar(err, 'Gemini', modelo) };
  }
}

async function probarGroq(apiKey) {
  const t0 = Date.now();
  try {
    const groq = new Groq({ apiKey });
    const lista = await groq.models.list();
    const whisper = (lista?.data ?? []).some((m) => String(m.id).includes('whisper'));
    return { ok: true, ms: Date.now() - t0, mensaje: whisper ? 'Clave válida; Whisper disponible.' : 'Clave válida, pero no aparece un modelo Whisper.' };
  } catch (err) {
    logError('status', 'prueba Groq', err);
    return { ok: false, ...clasificar(err, 'Groq') };
  }
}

function clasificar(err, servicio, modelo) {
  const status = err?.status ?? err?.statusCode ?? 0;
  const msg = String(err?.message ?? '');
  if (status === 401 || status === 403 || /api key|API_KEY_INVALID|invalid.*key/i.test(msg)) return { code: 'API_KEY_INVALID', mensaje: `${servicio} rechazó la clave (${status || 'inválida'}). Genera una nueva.` };
  if (status === 429 || /quota|RESOURCE_EXHAUSTED|rate/i.test(msg)) return { code: 'QUOTA_EXCEEDED', mensaje: `${servicio}: cuota gratuita agotada o límite por minuto. Espera e intenta de nuevo.` };
  if (status === 404 || /not found|MODEL_NOT_FOUND/i.test(msg)) return { code: 'MODEL_NOT_FOUND', mensaje: `${servicio}: el modelo ${modelo ?? ''} no existe para tu cuenta. Cambia GEMINI_MODEL en .env.local.` };
  if (/ENOTFOUND|ECONNREFUSED|fetch failed|network|ETIMEDOUT/i.test(msg)) return { code: 'NETWORK_ERROR', mensaje: `No hay conexión con ${servicio} desde el servidor.` };
  return { code: 'UNKNOWN', mensaje: `${servicio}: ${msg.slice(0, 160) || 'error desconocido'}` };
}
