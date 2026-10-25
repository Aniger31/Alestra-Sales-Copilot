/**
 * catalogService.js — consulta y validación del catálogo simulado.
 * Lee catalog.json una sola vez (singleton de módulo).
 * Solo se ejecuta en el servidor.
 *
 * IMPORTANTE: este servicio es la fuente de verdad de productos y precios.
 * Ninguna respuesta de Gemini puede sobrescribir datos de este catálogo.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { ERROR_CODES, ERROR_MESSAGES, OPPORTUNITY_TYPES } from '../lib/constants.js';
import { evaluarReglasEscalamiento, clasificarOportunidad } from '../lib/commercialRules.js';

// ─── Carga del catálogo (una sola vez por proceso) ─────────────────────────────

let _catalogo = null;

function getCatalogo() {
  if (_catalogo) return _catalogo;

  try {
    // process.cwd() en Next.js apunta a la raíz del proyecto
    const rutaArchivo = join(process.cwd(), 'src', 'data', 'catalog.json');
    const contenido = readFileSync(rutaArchivo, 'utf-8');
    _catalogo = JSON.parse(contenido);
  } catch (err) {
    throw new Error(`Error al cargar el catálogo: ${err.message}`);
  }

  return _catalogo;
}

// ─── Funciones exportadas ──────────────────────────────────────────────────────

/**
 * Devuelve el catálogo completo (solo lectura).
 * No exponer directamente al cliente sin filtrar.
 */
export function obtenerCatalogo() {
  return getCatalogo();
}

/**
 * Devuelve todos los productos del catálogo.
 * @returns {Array}
 */
export function obtenerTodosLosProductos() {
  return getCatalogo().productos ?? [];
}

/**
 * Busca productos por sus SKUs.
 * Solo devuelve productos que existen en el catálogo — nunca inventa.
 *
 * @param {string[]} skus
 * @returns {Array} productos encontrados (los SKUs no válidos se ignoran silenciosamente)
 */
export function obtenerProductosPorSKUs(skus) {
  if (!Array.isArray(skus) || skus.length === 0) return [];

  const productos = getCatalogo().productos ?? [];
  const skusSet = new Set(skus.map((s) => s.trim().toUpperCase()));

  return productos.filter((p) => skusSet.has(p.sku.toUpperCase()));
}

/**
 * Busca productos por familia.
 *
 * @param {string} familiaId  — ej. 'DC', 'M365', 'BK'
 * @returns {Array}
 */
export function buscarProductosPorFamilia(familiaId) {
  if (!familiaId) return [];

  const productos = getCatalogo().productos ?? [];
  return productos.filter(
    (p) => p.familia.toUpperCase() === familiaId.trim().toUpperCase(),
  );
}

/**
 * Evalúa las 10 reglas de escalamiento del catálogo (ESC-01 … ESC-10) y los umbrales
 * de cada producto.
 *
 * CORRECCIÓN (Tarea 7): la versión anterior marcaba `requiere: true` en cuanto algún
 * producto tenía texto en `cuando_entra_arquitecto` — casi todos lo tienen —, así que
 * todos los casos salían "requiere arquitecto". Ahora esas condiciones se devuelven en
 * `revisar` (informativas) y solo escalan las reglas que de verdad se cumplen.
 * La lógica vive en lib/commercialRules.js para usarla también en el cliente.
 *
 * @param {string[]} skus      — SKUs recomendados
 * @param {object}   contexto  — { presupuestoMensual?, totalUsuarios?, cantidades?, parametros?, hechos? }
 * @returns {{ requiere: boolean, razones: string[], reglas: object[], revisar: object[], reglasEscalamiento: object[] }}
 */
export function evaluarEscalamiento(skus, contexto = {}) {
  const catalogo = getCatalogo();
  const lineas = obtenerProductosPorSKUs(skus).map((p) => ({
    sku: p.sku,
    cantidad: contexto.cantidades?.[p.sku] ?? null,
    parametros: contexto.parametros?.[p.sku] ?? {},
  }));
  const res = evaluarReglasEscalamiento(catalogo, lineas, contexto.hechos ?? {}, {
    mensualEstimadoMxn: Number(contexto.presupuestoMensual ?? 0),
    totalUsuarios: Number(contexto.totalUsuarios ?? 0),
  });
  return { ...res, reglasEscalamiento: catalogo.reglas_escalamiento ?? [] };
}

/**
 * Sugiere paquetes del catálogo que contengan al menos un SKU de la lista.
 *
 * @param {string[]} skus
 * @returns {Array} paquetes compatibles con datos completos de sus productos
 */
export function obtenerPaquetesCompatibles(skus) {
  if (!Array.isArray(skus) || skus.length === 0) return [];

  const catalogo = getCatalogo();
  const paquetes = catalogo.paquetes ?? [];
  const skusSet = new Set(skus.map((s) => s.trim().toUpperCase()));

  const paquetesCompatibles = paquetes.filter((paq) => {
    const productosDelPaquete = Array.isArray(paq.productos) ? paq.productos : [];
    return productosDelPaquete.some((sku) => skusSet.has(sku.toUpperCase()));
  });

  // Enriquecer cada paquete con los objetos completos de sus productos
  return paquetesCompatibles.map((paq) => ({
    ...paq,
    productosDetalle: obtenerProductosPorSKUs(
      Array.isArray(paq.productos) ? paq.productos : [],
    ),
  }));
}

/**
 * Construye un resumen de SKUs y nombres para pasarle a Gemini como contexto.
 * NUNCA incluir precios en el prompt para evitar que Gemini los modifique.
 *
 * @returns {string}
 */
export function construirContextoCatalogo() {
  const productos = getCatalogo().productos ?? [];
  return productos
    .map((p) => `${p.sku} — ${p.nombre} (${p.tipo}, familia: ${p.familia})`)
    .join('\n');
}

/**
 * Determina el tipo de oportunidad global a partir de los productos recomendados.
 * Si se pasa el resultado de evaluarEscalamiento(), distingue además "mixto"
 * (parte con arquitecto, parte cotizable) de "a la medida".
 *
 * @param {Array}  productos     — lista de objetos producto del catálogo
 * @param {object} [escalamiento] — resultado de evaluarEscalamiento()
 * @returns {string}             — uno de OPPORTUNITY_TYPES
 */
export function determinarTipoOportunidad(productos, escalamiento = null) {
  if (!productos || productos.length === 0) return OPPORTUNITY_TYPES.INSUFFICIENT;
  const afectados = new Set(escalamiento?.skusAfectados ?? []);
  const lineas = productos.map((p) => ({
    tipo: p.tipo,
    estado: p.tipo === 'a la medida' || afectados.has(p.sku) ? 'requiere_arquitecto' : 'pendiente',
  }));
  return clasificarOportunidad(lineas, escalamiento, { estricto: false });
}

/**
 * Calcula estimación de precio mensual con descuentos de plazo.
 * La estimación es FICTICIA y solo se muestra si todos los productos tienen precio.
 * Nunca incluye IVA (se añade nota en la UI).
 *
 * @param {Array}  productos       — objetos producto
 * @param {number} plazoMeses      — 12 | 24 | 36
 * @param {object} [cantidades]    — { [sku]: cantidad } — default 1 por producto
 * @returns {{ subtotal: number, descuentoPct: number, totalMensual: number, tienePrecios: boolean }}
 */
export function calcularEstimacionPrecio(productos, plazoMeses = 12, cantidades = {}) {
  if (!productos || productos.length === 0) {
    return { subtotal: 0, descuentoPct: 0, totalMensual: 0, tienePrecios: false };
  }

  // Solo calcular si todos los productos tienen precio mensual definido
  const tienePrecios = productos.every(
    (p) => typeof p.precio_mensual_mxn === 'number' && p.precio_mensual_mxn > 0,
  );

  if (!tienePrecios) {
    return { subtotal: 0, descuentoPct: 0, totalMensual: 0, tienePrecios: false };
  }

  const subtotal = productos.reduce((acc, p) => {
    const cantidad = Number(cantidades[p.sku] ?? 1);
    return acc + p.precio_mensual_mxn * cantidad;
  }, 0);

  // Descuentos del catálogo por plazo (condiciones_comerciales)
  const descuentoPct = plazoMeses >= 36 ? 10 : plazoMeses >= 24 ? 5 : 0;
  const totalMensual = subtotal * (1 - descuentoPct / 100);

  return { subtotal, descuentoPct, totalMensual, tienePrecios: true };
}

/**
 * Devuelve las condiciones comerciales del catálogo (solo lectura).
 */
export function obtenerCondicionesComerciales() {
  return getCatalogo().condiciones_comerciales ?? [];
}

/**
 * Devuelve los casos ficticios de clientes para usar en demos.
 */
export function obtenerCasosClientes() {
  return getCatalogo().casos_clientes ?? [];
}

/**
 * Devuelve el texto del aviso/disclaimer del catálogo.
 */
export function obtenerAviso() {
  return getCatalogo().aviso ?? '';
}
