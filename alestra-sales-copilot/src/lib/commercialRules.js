/**
 * commercialRules.js — reglas comerciales deterministas del catálogo simulado.
 *
 * Funciones PURAS (sin fs ni APIs): se usan en el servidor (catalogService, Route Handlers)
 * y en el cliente (Diagnóstico y Propuesta) para recalcular al instante.
 *
 * Ningún precio sale de la IA: todo se calcula con los datos del catálogo que se reciben
 * como parámetro (`catalogo` = { productos, paquetes, reglas_escalamiento? }).
 */

import { OPPORTUNITY_TYPES } from './constants.js';

// ─── Reglas que el catálogo trae escritas en texto, convertidas a datos ───────
// Fuente: campo `cuando_entra_arquitecto` de cada producto (se cita en `fuente`).
// param 'cantidad' usa la cantidad de la línea; otro nombre se lee de linea.parametros.
export const UMBRALES_ARQUITECTO = {
  'SIM-DC-02': [{ param: 'cantidad', max: 3, fuente: 'Más de 3 racks' }],
  'SIM-DC-05': [{ param: 'cantidad', max: 1, fuente: 'Más de un paquete L' }],
  'SIM-DC-07': [{ param: 'cantidad', max: 20, fuente: 'Más de 20 servidores' }],
  'SIM-DC-08': [{ param: 'cantidad', max: 5, fuente: 'Más de 5 sitios' }],
  'SIM-M365-01': [{ param: 'cantidad', max: 300, fuente: 'Más de 300 usuarios' }],
  'SIM-M365-02': [{ param: 'cantidad', max: 300, fuente: 'Más de 300 usuarios' }],
  'SIM-M365-03': [{ param: 'cantidad', max: 300, fuente: 'Más de 300 usuarios' }],
  'SIM-M365-04': [{ param: 'cantidad', max: 1000, fuente: 'Más de 1,000 usuarios' }],
  'SIM-M365-05': [{ param: 'cantidad', max: 500, fuente: 'Más de 500 usuarios' }],
  'SIM-M365-06': [{ param: 'cantidad', max: 500, fuente: 'Más de 500 buzones' }],
  'SIM-M365-08': [{ param: 'cantidad', max: 100, fuente: 'Más de 100 extensiones' }],
  'SIM-BK-01': [{ param: 'cantidad', max: 100, fuente: 'Más de 100 TB' }],
  'SIM-BK-02': [{ param: 'cantidad', max: 2000, fuente: 'Más de 2,000 usuarios' }],
  'SIM-BK-03': [{ param: 'tamanoBaseDatosTB', max: 5, fuente: 'Bases de datos de más de 5 TB' }],
  'SIM-BK-04': [{ param: 'cantidad', max: 1000, fuente: 'Más de 1,000 equipos' }],
  'SIM-AWS-05': [{ param: 'cantidad', max: 10, fuente: 'Más de 10 servidores' }],
  'SIM-AZ-03': [{ param: 'cantidad', max: 200, fuente: 'Más de 200 usuarios' }],
  'SIM-AZ-04': [{ param: 'cantidad', max: 10, fuente: 'Más de 10 servidores' }],
  'SIM-IA-02': [{ param: 'usuarios', max: 100, fuente: 'Más de 100 usuarios' }],
  'SIM-OCI-02': [{ param: 'tamanoTB', max: 2, fuente: 'Más de 2 TB' }],
  'SIM-OCI-03': [
    { param: 'tamanoTB', max: 2, fuente: 'Más de 2 TB' },
    { param: 'cantidad', max: 1, fuente: 'Más de una base' },
  ],
  'SIM-AWS-01': [{ param: 'consumoMensualMxn', max: 250000, fuente: 'Consumo mayor a $250,000 al mes' }],
  'SIM-AWS-03': [{ param: 'consumoMensualMxn', max: 250000, fuente: 'Consumo mayor a $250,000 al mes' }],
  'SIM-AZ-01': [{ param: 'consumoMensualMxn', max: 250000, fuente: 'Consumo mayor a $250,000 al mes' }],
  'SIM-AZ-05': [{ param: 'consumoMensualMxn', max: 250000, fuente: 'Consumo mayor a $250,000 al mes' }],
  'SIM-OCI-01': [{ param: 'consumoMensualMxn', max: 250000, fuente: 'Consumo mayor a $250,000 al mes' }],
  'SIM-OCI-05': [{ param: 'consumoMensualMxn', max: 250000, fuente: 'Consumo mayor a $250,000 al mes' }],
};

// Fuente: descripción "Cuesta 10% del consumo mensual, mínimo $12,000".
export const PORCENTAJE_DEL_CONSUMO = {
  'SIM-AWS-03': { pct: 10, minimoMxn: 12000, consumoDe: 'SIM-AWS-01' },
  'SIM-AZ-05': { pct: 10, minimoMxn: 12000, consumoDe: 'SIM-AZ-01' },
  'SIM-OCI-05': { pct: 10, minimoMxn: 12000, consumoDe: 'SIM-OCI-01' },
};

// Fuente SIM-IA-01: "Incluye 2,000 conversaciones al mes; las adicionales cuestan $4 cada una."
export const EXCEDENTES = {
  'SIM-IA-01': { param: 'conversacionesMes', incluidas: 2000, precioExtraMxn: 4 },
};

// Fuente: tabla condiciones_comerciales.
export const CONDICIONES = {
  ivaPct: 16,
  descuentoPorPlazo: { 12: 0, 24: 5, 36: 10 },
  descuentoVolumenM365: {
    minimoUsuarios: 100,
    pct: 3,
    skus: ['SIM-M365-01', 'SIM-M365-02', 'SIM-M365-03', 'SIM-M365-04', 'SIM-M365-05'],
  },
  licenciasBaseM365: ['SIM-M365-01', 'SIM-M365-02', 'SIM-M365-03', 'SIM-M365-04'],
  descuentoMaximoVendedorPct: 10,
  mensualidadesCargoUnico: 3,
  vigenciaDias: 30,
  presupuestoMaximoEstandarMxn: 250000,
};

export const REGULATORIOS = {
  CNBV: 'CNBV',
  salud: 'Datos de salud',
  datos_personales_sensibles: 'Datos personales sensibles',
  pagos_tarjeta: 'Pagos con tarjeta',
};

export const LEYENDA_PROPUESTA =
  'Propuesta preliminar con datos SIMULADOS del Hackathon. No es una cotización oficial de Alestra.';

// Parámetros extra que pide cada producto además de la cantidad (para la UI).
export function parametrosDeProducto(producto) {
  if (!producto) return [];
  const out = [];
  const u = producto.unidad_cobro ?? '';
  if (u === 'según consumo' || u.startsWith('%')) out.push({ clave: 'consumoMensualMxn', etiqueta: 'Consumo mensual estimado (MXN)' });
  if (producto.sku === 'SIM-IA-01') out.push({ clave: 'conversacionesMes', etiqueta: 'Conversaciones al mes' });
  if (producto.sku === 'SIM-IA-02') out.push({ clave: 'usuarios', etiqueta: 'Usuarios del agente' });
  if (producto.sku === 'SIM-OCI-02' || producto.sku === 'SIM-OCI-03') out.push({ clave: 'tamanoTB', etiqueta: 'Tamaño de la base (TB)' });
  if (producto.sku === 'SIM-BK-03') out.push({ clave: 'tamanoBaseDatosTB', etiqueta: 'Base de datos más grande (TB)' });
  return out;
}

/** true si el producto no lleva cantidad (a la medida, según consumo o % del consumo). */
export function productoSinCantidad(producto) {
  if (!producto) return true;
  const u = producto.unidad_cobro ?? '';
  return producto.tipo === 'a la medida' || u === 'según consumo' || u.startsWith('%');
}

// ─── Utilidades internas ───────────────────────────────────────────────────────
const r2 = (n) => Math.round(n * 100) / 100;
const POR_UNIDAD = /^por (usuario|servidor|TB|equipo) al mes$/;
const FAMILIAS_INFRA = ['DC', 'AWS', 'AZ', 'OCI'];
const MIGRACIONES = ['SIM-AWS-05', 'SIM-AZ-04', 'SIM-DC-09'];

function indice(catalogo) {
  const map = new Map((catalogo?.productos ?? []).map((p) => [p.sku, p]));
  return (sku) => map.get(sku) ?? null;
}

function textoRegla(catalogo, id) {
  return (catalogo?.reglas_escalamiento ?? []).find((r) => r.id === id)?.cuando_entra_un_arquitecto ?? '';
}

// ─── Escalamiento: las 10 reglas ESC del catálogo + umbrales por producto ─────

/**
 * @param catalogo  { productos, reglas_escalamiento? }
 * @param lineas    [{ sku, cantidad?, parametros? }]
 * @param hechos    { requisitosRegulatorios[], integracionSistemasInternos[], aplicacionesSinDocumentar,
 *                    solucionHibrida, rpoMinutos, rtoHoras, disponibilidadPct, oracleTB,
 *                    oracleRacODataGuard, requiereGpu, disenoFormalSolicitado }
 * @param opciones  { mensualEstimadoMxn?, totalUsuarios? }
 * @returns {{ requiere, razones: string[], reglas, umbralesProducto, revisar, skusAfectados }}
 */
export function evaluarReglasEscalamiento(catalogo, lineas = [], hechos = {}, opciones = {}) {
  const getProducto = indice(catalogo);
  const reglas = [];
  const add = (id, motivo, skusAfectados = []) =>
    reglas.push({ id, texto: textoRegla(catalogo, id), motivo, skusAfectados, global: skusAfectados.length === 0 });

  const conP = lineas.map((l) => ({ ...l, p: getProducto(l.sku) })).filter((l) => l.p);
  const skusDe = (pred) => conP.filter(pred).map((l) => l.sku);
  const h = hechos ?? {};

  // ESC-01: productos a la medida
  const aLaMedida = skusDe((l) => l.p.tipo === 'a la medida');
  if (aLaMedida.length) add('ESC-01', 'Incluye productos sin precio de lista (a la medida).', aLaMedida);

  // ESC-02: más de 300 usuarios M365 o licencias mezcladas
  const licencias = conP.filter((l) => CONDICIONES.licenciasBaseM365.includes(l.sku));
  const usuariosM365 = licencias.reduce((s, l) => s + (Number(l.cantidad) || 0), 0);
  const tiposLicencia = new Set(licencias.map((l) => l.sku)).size;
  const hayM365 = conP.some((l) => l.p.familia === 'M365');
  const totalUsuarios = Number(opciones.totalUsuarios) || 0;
  if (usuariosM365 > 300 || tiposLicencia > 1 || (hayM365 && totalUsuarios > 300)) {
    add(
      'ESC-02',
      tiposLicencia > 1 ? 'Licencias de Microsoft 365 de distintos tipos.' : `${Math.max(usuariosM365, totalUsuarios)} usuarios de Microsoft 365.`,
      skusDe((l) => l.p.familia === 'M365'),
    );
  }

  // ESC-03: migración de más de 10 servidores o aplicaciones sin documentar
  const servidores = conP.filter((l) => ['SIM-AWS-05', 'SIM-AZ-04'].includes(l.sku)).reduce((s, l) => s + (Number(l.cantidad) || 0), 0);
  if (servidores > 10 || h.aplicacionesSinDocumentar) {
    add('ESC-03', servidores > 10 ? `Migración de ${servidores} servidores.` : 'Aplicaciones sin documentación.', skusDe((l) => MIGRACIONES.includes(l.sku)));
  }

  // ESC-04: requisitos regulatorios (revisa la solución completa; no bloquea líneas estándar)
  if (h.requisitosRegulatorios?.length) {
    add('ESC-04', `Requisitos regulatorios: ${h.requisitosRegulatorios.map((r) => REGULATORIOS[r] ?? r).join(', ')}.`, skusDe((l) => l.sku === 'SIM-BK-05'));
  }

  // ESC-05: integración con sistemas internos
  if (h.integracionSistemasInternos?.length) {
    add('ESC-05', `Integración con: ${h.integracionSistemasInternos.join(', ')}.`, skusDe((l) => l.p.familia === 'IA'));
  }

  // ESC-06: solución híbrida o multinube
  const familiasInfra = new Set(conP.filter((l) => FAMILIAS_INFRA.includes(l.p.familia)).map((l) => l.p.familia));
  if (familiasInfra.size >= 2 || h.solucionHibrida) {
    add(
      'ESC-06',
      familiasInfra.size >= 2 ? `Combina ${[...familiasInfra].join(' + ')}.` : 'El cliente combina nubes o nube con data center.',
      skusDe((l) => FAMILIAS_INFRA.includes(l.p.familia) || l.p.familia === 'BK'),
    );
  }

  // ESC-07: niveles de servicio más exigentes que los estándar
  const slas = [];
  if (h.rpoMinutos != null && h.rpoMinutos !== '' && Number(h.rpoMinutos) < 15) slas.push(`RPO ${h.rpoMinutos} min`);
  if (h.rtoHoras != null && h.rtoHoras !== '' && Number(h.rtoHoras) < 4) slas.push(`RTO ${h.rtoHoras} h`);
  if (h.disponibilidadPct != null && h.disponibilidadPct !== '' && Number(h.disponibilidadPct) > 99.95) slas.push(`disponibilidad ${h.disponibilidadPct}%`);
  if (slas.length) add('ESC-07', `Nivel de servicio solicitado: ${slas.join(', ')}.`, skusDe((l) => l.sku === 'SIM-DC-07' || l.p.familia === 'BK'));

  // ESC-08: Oracle de más de 2 TB o con RAC / Data Guard
  if (Number(h.oracleTB) > 2 || h.oracleRacODataGuard) {
    add('ESC-08', h.oracleRacODataGuard ? 'Oracle con RAC o Data Guard.' : `Base Oracle de ${h.oracleTB} TB.`, skusDe((l) => l.p.familia === 'OCI'));
  }

  // ESC-09: presupuesto mensual estimado mayor a $250,000
  const mensual = Number(opciones.mensualEstimadoMxn) || 0;
  if (mensual > CONDICIONES.presupuestoMaximoEstandarMxn) {
    add('ESC-09', `Mensualidad estimada de $${Math.round(mensual).toLocaleString('es-MX')}.`);
  }

  // ESC-10: el cliente pide un diseño formal
  if (h.disenoFormalSolicitado) add('ESC-10', 'El cliente pidió un diseño o documento técnico formal.');

  // Umbrales numéricos de cada producto
  const umbralesProducto = [];
  for (const l of conP) {
    for (const u of UMBRALES_ARQUITECTO[l.sku] ?? []) {
      const v = Number(u.param === 'cantidad' ? l.cantidad : l.parametros?.[u.param]);
      if (Number.isFinite(v) && v > u.max) umbralesProducto.push({ sku: l.sku, producto: l.p.nombre, motivo: u.fuente, valor: v });
    }
    if (l.cantidad != null && l.p.cantidad_maxima != null && Number(l.cantidad) > l.p.cantidad_maxima &&
        !umbralesProducto.some((x) => x.sku === l.sku)) {
      umbralesProducto.push({ sku: l.sku, producto: l.p.nombre, motivo: `Cantidad mayor al máximo de catálogo (${l.p.cantidad_maxima})`, valor: Number(l.cantidad) });
    }
    if (l.sku === 'SIM-AZ-03' && h.requiereGpu) umbralesProducto.push({ sku: l.sku, producto: l.p.nombre, motivo: 'Programas que necesitan GPU', valor: true });
  }

  // Condiciones por producto que el vendedor debe verificar (informativas: no escalan solas)
  const revisar = conP
    .filter((l) => l.p.cuando_entra_arquitecto && l.p.tipo !== 'a la medida')
    .map((l) => ({ sku: l.sku, producto: l.p.nombre, texto: l.p.cuando_entra_arquitecto }));

  const skusAfectados = [...new Set([...reglas.flatMap((r) => r.skusAfectados), ...umbralesProducto.map((x) => x.sku)])];
  const razones = [
    ...reglas.map((r) => `${r.motivo} (${r.id})`),
    ...umbralesProducto.map((x) => `${x.producto}: ${x.motivo}.`),
  ];

  return { requiere: razones.length > 0, razones, reglas, umbralesProducto, revisar, skusAfectados };
}

// ─── Propuesta económica ───────────────────────────────────────────────────────

/**
 * Calcula la propuesta preliminar 100 % con datos del catálogo.
 *
 * @param catalogo  { productos, paquetes, reglas_escalamiento? }
 * @param input     { lineas: [{ sku, cantidad, parametros }], plazoMeses, hechos, fecha? , totalUsuarios? }
 */
export function calcularPropuesta(catalogo, input = {}) {
  const getProducto = indice(catalogo);
  const plazo = Number(input.plazoMeses ?? 12);
  if (!(plazo in CONDICIONES.descuentoPorPlazo)) throw new Error(`Plazo no válido: ${input.plazoMeses}. Usa 12, 24 o 36 meses.`);

  const advertencias = [];
  const supuestos = [
    'Los cargos únicos de productos cobrados por usuario, servidor, TB o equipo se cobran una vez por contrato; en productos "por mes" se cobran por unidad.',
    'Los descuentos por plazo, paquete y volumen se suman y aplican solo a mensualidades fijas, no al consumo.',
  ];
  const entradas = input.lineas ?? [];
  const lineas = [];

  for (const e of entradas) {
    const p = getProducto(e.sku);
    if (!p) {
      advertencias.push(`SKU descartado porque no existe en el catálogo: ${e.sku}`);
      continue;
    }
    const cantidad = e.cantidad == null || e.cantidad === '' ? null : Number(e.cantidad);
    const parametros = e.parametros ?? {};
    const l = {
      sku: p.sku, nombre: p.nombre, familia: p.familia, tipo: p.tipo, unidadCobro: p.unidad_cobro,
      cantidad, parametros,
      precioUnitarioMensualMxn: p.precio_mensual_mxn, cargoUnicoUnitarioMxn: p.cargo_unico_mxn,
      mensualBrutoMxn: 0, mensualConsumoMxn: 0, cargoUnicoMxn: 0,
      descuentos: [], descuentoPct: 0, notas: [], estado: 'cotizable',
    };

    if (p.tipo === 'a la medida') {
      l.estado = 'requiere_arquitecto';
      l.notas.push('Sin precio de lista: lo diseña un arquitecto de soluciones.');
    } else if (p.unidad_cobro === 'según consumo') {
      const consumo = Number(parametros.consumoMensualMxn);
      if (!Number.isFinite(consumo) || consumo <= 0) {
        l.estado = 'pendiente';
        l.notas.push('Falta el consumo mensual estimado del cliente.');
      } else {
        l.mensualConsumoMxn = r2(consumo);
        l.notas.push('Consumo estimado; se cobra lo que realmente se use.');
      }
    } else if (PORCENTAJE_DEL_CONSUMO[p.sku]) {
      const regla = PORCENTAJE_DEL_CONSUMO[p.sku];
      const consumo = Number(parametros.consumoMensualMxn ?? entradas.find((x) => x.sku === regla.consumoDe)?.parametros?.consumoMensualMxn);
      if (Number.isFinite(consumo) && consumo > 0) {
        l.mensualBrutoMxn = r2(Math.max((consumo * regla.pct) / 100, regla.minimoMxn));
        l.notas.push(`${regla.pct}% del consumo mensual, mínimo $${regla.minimoMxn.toLocaleString('es-MX')}.`);
      } else {
        l.mensualBrutoMxn = regla.minimoMxn;
        l.notas.push(`Se cotiza el mínimo mensual. El cargo real es ${regla.pct}% del consumo.`);
      }
      l.cantidad = 1;
    } else if (cantidad == null || !Number.isFinite(cantidad)) {
      l.estado = 'pendiente';
      l.notas.push('Cantidad por confirmar con el cliente.');
    } else if (p.cantidad_minima != null && cantidad < p.cantidad_minima) {
      l.estado = 'invalida';
      l.notas.push(`La cantidad mínima en catálogo es ${p.cantidad_minima}.`);
    } else {
      l.mensualBrutoMxn = r2((p.precio_mensual_mxn ?? 0) * cantidad);
      if (p.cargo_unico_mxn != null) l.cargoUnicoMxn = r2(p.cargo_unico_mxn * (POR_UNIDAD.test(p.unidad_cobro) ? 1 : cantidad));
      const exc = EXCEDENTES[p.sku];
      if (exc) {
        const uso = Number(parametros[exc.param]);
        if (Number.isFinite(uso) && uso > exc.incluidas) {
          l.mensualConsumoMxn = r2((uso - exc.incluidas) * exc.precioExtraMxn * cantidad);
          l.notas.push(`${(uso - exc.incluidas).toLocaleString('es-MX')} conversaciones adicionales a $${exc.precioExtraMxn} c/u.`);
        } else if (!Number.isFinite(uso)) {
          l.notas.push(`Incluye ${exc.incluidas.toLocaleString('es-MX')} conversaciones al mes; confirmar volumen.`);
        }
      }
      if (p.plazo_minimo_meses && plazo < p.plazo_minimo_meses) {
        l.estado = 'invalida';
        l.notas.push(`Plazo mínimo de ${p.plazo_minimo_meses} meses.`);
      }
    }
    lineas.push(l);
  }

  // Escalamiento
  const mensualEstimadoMxn = lineas.reduce((s, l) => s + l.mensualBrutoMxn + l.mensualConsumoMxn, 0);
  const escalamiento = evaluarReglasEscalamiento(catalogo, entradas, input.hechos, { mensualEstimadoMxn, totalUsuarios: input.totalUsuarios });
  for (const l of lineas) {
    if (l.estado !== 'requiere_arquitecto' && escalamiento.skusAfectados.includes(l.sku)) {
      l.estado = 'requiere_arquitecto';
      l.notas.push('Lo valida un arquitecto antes de cotizar (precio de referencia).');
    }
  }
  // Un prerrequisito que solo sirve a líneas con arquitecto también va con arquitecto
  for (const l of lineas) {
    if (l.estado === 'requiere_arquitecto') continue;
    const dependientes = lineas.filter((d) => getProducto(d.sku)?.requiere_alguno_de?.includes(l.sku));
    if (dependientes.length && dependientes.every((d) => d.estado === 'requiere_arquitecto')) {
      l.estado = 'requiere_arquitecto';
      l.notas.push('Prerrequisito de productos que diseña un arquitecto.');
    }
  }

  // Descuentos (solo líneas cotizables)
  const cotizables = lineas.filter((l) => l.estado === 'cotizable');
  const setCot = new Set(cotizables.map((l) => l.sku));
  const pctPlazo = CONDICIONES.descuentoPorPlazo[plazo];
  const paquetesAplicados = [];
  const enPaquete = new Map();
  for (const paq of catalogo?.paquetes ?? []) {
    if (paq.productos.every((s) => setCot.has(s)) && paq.productos.every((s) => !enPaquete.has(s))) {
      paquetesAplicados.push({ id: paq.id, nombre: paq.nombre, descuentoPct: paq.descuento_pct });
      paq.productos.forEach((s) => enPaquete.set(s, paq));
    }
  }
  const vol = CONDICIONES.descuentoVolumenM365;
  const usuariosLicencia = cotizables.filter((l) => CONDICIONES.licenciasBaseM365.includes(l.sku)).reduce((s, l) => s + l.cantidad, 0);
  let requiereAutorizacionGerente = false;
  for (const l of cotizables) {
    if (l.mensualBrutoMxn <= 0) continue;
    if (pctPlazo) l.descuentos.push({ concepto: `Plazo de ${plazo} meses`, pct: pctPlazo });
    const paq = enPaquete.get(l.sku);
    if (paq) l.descuentos.push({ concepto: `Paquete ${paq.id} ${paq.nombre}`, pct: paq.descuento_pct });
    if (usuariosLicencia >= vol.minimoUsuarios && vol.skus.includes(l.sku)) l.descuentos.push({ concepto: 'Volumen Microsoft 365 (100+ usuarios)', pct: vol.pct });
    l.descuentoPct = l.descuentos.reduce((s, d) => s + d.pct, 0);
    if (l.descuentoPct > CONDICIONES.descuentoMaximoVendedorPct) requiereAutorizacionGerente = true;
  }
  for (const l of lineas) {
    l.descuentoMxn = r2((l.mensualBrutoMxn * l.descuentoPct) / 100);
    l.mensualNetoMxn = r2(l.mensualBrutoMxn - l.descuentoMxn + l.mensualConsumoMxn);
  }

  const sum = (k) => r2(cotizables.reduce((s, l) => s + l[k], 0));
  const mensualSinIva = sum('mensualNetoMxn');
  const unicoSinIva = sum('cargoUnicoMxn');
  const iva = CONDICIONES.ivaPct / 100;
  const totales = {
    mensualBrutoMxn: sum('mensualBrutoMxn'),
    descuentoMensualMxn: sum('descuentoMxn'),
    consumoEstimadoMensualMxn: sum('mensualConsumoMxn'),
    mensualSinIvaMxn: mensualSinIva,
    mensualIvaMxn: r2(mensualSinIva * iva),
    mensualConIvaMxn: r2(mensualSinIva * (1 + iva)),
    cargoUnicoSinIvaMxn: unicoSinIva,
    cargoUnicoConIvaMxn: r2(unicoSinIva * (1 + iva)),
    cargoUnicoEnMensualidadesMxn: r2((unicoSinIva * (1 + iva)) / CONDICIONES.mensualidadesCargoUnico),
    valorContratoSinIvaMxn: r2(mensualSinIva * plazo + unicoSinIva),
  };

  if (requiereAutorizacionGerente) {
    advertencias.push(`El descuento total de alguna línea supera ${CONDICIONES.descuentoMaximoVendedorPct}%: requiere autorización del gerente.`);
  }

  const fecha = input.fecha ? new Date(input.fecha) : new Date();
  const vigencia = new Date(fecha);
  vigencia.setDate(vigencia.getDate() + CONDICIONES.vigenciaDias);

  return {
    leyenda: LEYENDA_PROPUESTA,
    fecha: fecha.toISOString(),
    vigenciaHasta: vigencia.toISOString().slice(0, 10),
    plazoMeses: plazo,
    moneda: 'MXN',
    tipoOportunidad: clasificarOportunidad(lineas, escalamiento, { estricto: true }),
    requiereArquitecto: escalamiento.requiere,
    requiereAutorizacionGerente,
    lineas,
    paquetesAplicados,
    totales,
    escalamiento,
    pendientes: lineas.filter((l) => l.estado === 'pendiente' || l.estado === 'invalida').map((l) => ({ sku: l.sku, nombre: l.nombre, motivo: l.notas.join(' ') })),
    supuestos,
    advertencias,
  };
}

/**
 * Tipo de oportunidad a partir de las líneas y del escalamiento.
 *  - insuficiente: sin productos
 *  - a la medida: requiere arquitecto y ninguna línea se puede cotizar sin él
 *  - mixto: requiere arquitecto para una parte; el resto se cotiza hoy
 *  - configurable: hay que dimensionar (usuarios, servidores, TB)
 *  - estándar: precio fijo, el vendedor cotiza solo
 */
export function clasificarOportunidad(lineas, escalamiento, { estricto = true } = {}) {
  if (!lineas?.length) return OPPORTUNITY_TYPES.INSUFFICIENT;
  // estricto: solo cuentan líneas ya cotizadas (Propuesta). No estricto: también las que
  // podrían cotizarse sin arquitecto cuando aún no hay cantidades (análisis inicial).
  const cotizables = lineas.filter((l) => (estricto ? l.estado === 'cotizable' : l.estado !== 'requiere_arquitecto'));
  if (escalamiento?.requiere) return cotizables.length ? OPPORTUNITY_TYPES.MIXED : OPPORTUNITY_TYPES.CUSTOM;
  if (lineas.some((l) => l.tipo === 'configurable')) return OPPORTUNITY_TYPES.CONFIGURABLE;
  return OPPORTUNITY_TYPES.STANDARD;
}

/** Prerrequisitos faltantes y paquetes a 1–2 productos de aplicar. */
export function sugerenciasCatalogo(catalogo, skus = []) {
  const getProducto = indice(catalogo);
  const set = new Set(skus);
  const prerrequisitosFaltantes = [];
  for (const sku of set) {
    const p = getProducto(sku);
    if (p?.requiere_alguno_de?.length && !p.requiere_alguno_de.some((r) => set.has(r))) {
      prerrequisitosFaltantes.push({ sku, nombre: p.nombre, requiereAlgunoDe: p.requiere_alguno_de });
    }
  }
  const paquetesCercanos = (catalogo?.paquetes ?? [])
    .map((paq) => ({ paq, faltan: paq.productos.filter((s) => !set.has(s)) }))
    .filter(({ paq, faltan }) => faltan.length > 0 && faltan.length < paq.productos.length && faltan.length <= 2)
    .map(({ paq, faltan }) => ({ id: paq.id, nombre: paq.nombre, descuentoPct: paq.descuento_pct, faltan }));
  return { prerrequisitosFaltantes, paquetesCercanos };
}
