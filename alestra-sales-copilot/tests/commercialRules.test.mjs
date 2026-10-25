// Pruebas de las reglas comerciales con los 10 casos del catálogo simulado.
// Ejecutar desde la raíz del proyecto:  npm test
// Las cantidades de cada escenario son supuestos de prueba (lo que el vendedor
// confirmaría después de hacer las preguntas), no datos del catálogo.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calcularPropuesta, evaluarReglasEscalamiento } from '../src/lib/commercialRules.js';
import { analizarSinIA, detectarHechos } from '../src/lib/demoAnalysis.js';
import { evaluarEscalamiento, determinarTipoOportunidad, obtenerProductosPorSKUs } from '../src/services/catalogService.js';

const catalogo = JSON.parse(readFileSync(new URL('../src/data/catalog.json', import.meta.url)));
const FECHA = '2026-10-24T12:00:00.000Z';

const ESCENARIOS = {
  'CASO-01': { lineas: [{ sku: 'SIM-M365-03', cantidad: 25 }, { sku: 'SIM-BK-02', cantidad: 25 }, { sku: 'SIM-M365-07', cantidad: 25 }, { sku: 'SIM-M365-06', cantidad: 25 }], hechos: {} },
  'CASO-02': { lineas: [{ sku: 'SIM-DC-04', cantidad: 2 }, { sku: 'SIM-DC-07', cantidad: 2 }, { sku: 'SIM-BK-01', cantidad: 2 }, { sku: 'SIM-DC-09', cantidad: 1 }], hechos: { rtoHoras: 4 } },
  'CASO-03': { lineas: [{ sku: 'SIM-AWS-01', parametros: { consumoMensualMxn: 180000 } }, { sku: 'SIM-AWS-04', cantidad: 1 }, { sku: 'SIM-AWS-03' }], hechos: { requisitosRegulatorios: ['CNBV'] } },
  'CASO-04': { lineas: [{ sku: 'SIM-M365-04', cantidad: 1200 }, { sku: 'SIM-AZ-02', cantidad: 1 }, { sku: 'SIM-AZ-03', cantidad: 150 }], hechos: { requiereGpu: true } },
  'CASO-05': { lineas: [{ sku: 'SIM-IA-01', cantidad: 1, parametros: { conversacionesMes: 9000 } }, { sku: 'SIM-IA-04', cantidad: 1 }], hechos: {} },
  'CASO-06': { lineas: [{ sku: 'SIM-OCI-02', cantidad: 1, parametros: { tamanoTB: 6 } }, { sku: 'SIM-OCI-03', cantidad: 1, parametros: { tamanoTB: 6 } }, { sku: 'SIM-OCI-05' }], hechos: { oracleTB: 6 } },
  'CASO-07': { lineas: [{ sku: 'SIM-BK-01', cantidad: 3 }, { sku: 'SIM-BK-05', cantidad: 3 }], hechos: {} },
  'CASO-08': { lineas: [{ sku: 'SIM-AZ-01', parametros: { consumoMensualMxn: 90000 } }, { sku: 'SIM-DC-07', cantidad: 8 }, { sku: 'SIM-IA-02', cantidad: 1, parametros: { usuarios: 2500 } }], hechos: { solucionHibrida: true } },
  'CASO-09': { lineas: [{ sku: 'SIM-M365-02', cantidad: 30 }, { sku: 'SIM-M365-05', cantidad: 10 }], hechos: {} },
  'CASO-10': { lineas: [{ sku: 'SIM-DC-09', cantidad: 1 }, { sku: 'SIM-DC-04', cantidad: null }], hechos: { requisitosRegulatorios: ['salud', 'datos_personales_sensibles'] } },
};
// El catálogo usa estándar / mixto / a la medida. "configurable" también es cotizable por el vendedor.
const ACEPTA = { 'estándar': ['estándar', 'configurable'], mixto: ['mixto'], 'a la medida': ['a la medida'] };

for (const caso of catalogo.casos_clientes) {
  test(`${caso.id} ${caso.empresa} → "${caso.tipo_de_caso}"`, () => {
    const prop = calcularPropuesta(catalogo, { plazoMeses: 12, fecha: FECHA, ...ESCENARIOS[caso.id] });
    assert.ok(ACEPTA[caso.tipo_de_caso].includes(prop.tipoOportunidad), `obtuvo ${prop.tipoOportunidad}`);
    assert.equal(prop.requiereArquitecto, caso.tipo_de_caso !== 'estándar');
    for (const l of prop.lineas) {
      assert.equal(l.precioUnitarioMensualMxn, catalogo.productos.find((p) => p.sku === l.sku).precio_mensual_mxn);
    }
  });
}

test('CASO-01: aritmética del paquete PAQ-01 a 12 meses', () => {
  const prop = calcularPropuesta(catalogo, { plazoMeses: 12, fecha: FECHA, ...ESCENARIOS['CASO-01'] });
  assert.deepEqual(prop.paquetesAplicados.map((p) => p.id), ['PAQ-01']);
  assert.equal(prop.totales.mensualBrutoMxn, 13475); // 25×425 + 25×69 + 25×45
  assert.equal(prop.totales.mensualSinIvaMxn, 12397); // −8 %
  assert.equal(prop.totales.mensualConIvaMxn, 14380.52);
  assert.equal(prop.totales.cargoUnicoSinIvaMxn, 8750); // 25 buzones × 350
  assert.equal(prop.vigenciaHasta, '2026-11-23');
});

test('36 meses + paquete supera 10 % y pide autorización del gerente', () => {
  const prop = calcularPropuesta(catalogo, { plazoMeses: 36, fecha: FECHA, ...ESCENARIOS['CASO-01'] });
  assert.equal(prop.requiereAutorizacionGerente, true);
  assert.equal(prop.totales.mensualSinIvaMxn, 11049.5);
});

test('Soporte AWS = 10 % del consumo, mínimo $12,000', () => {
  const bajo = calcularPropuesta(catalogo, { lineas: [{ sku: 'SIM-AWS-01', parametros: { consumoMensualMxn: 50000 } }, { sku: 'SIM-AWS-03' }] });
  assert.equal(bajo.lineas.find((l) => l.sku === 'SIM-AWS-03').mensualBrutoMxn, 12000);
  const alto = calcularPropuesta(catalogo, { lineas: [{ sku: 'SIM-AWS-01', parametros: { consumoMensualMxn: 200000 } }, { sku: 'SIM-AWS-03' }] });
  assert.equal(alto.lineas.find((l) => l.sku === 'SIM-AWS-03').mensualBrutoMxn, 20000);
});

test('SKU inventado se descarta; cantidad bajo el mínimo es inválida; sin cantidad queda pendiente', () => {
  const prop = calcularPropuesta(catalogo, { lineas: [{ sku: 'SIM-FAKE-99', cantidad: 3 }, { sku: 'SIM-DC-07', cantidad: 1 }, { sku: 'SIM-M365-02' }] });
  assert.ok(prop.advertencias.some((a) => a.includes('SIM-FAKE-99')));
  assert.equal(prop.lineas.find((l) => l.sku === 'SIM-DC-07').estado, 'invalida');
  assert.equal(prop.lineas.find((l) => l.sku === 'SIM-M365-02').estado, 'pendiente');
  assert.equal(prop.totales.mensualSinIvaMxn, 0);
});

test('Volumen M365: 3 % adicional desde 100 usuarios', () => {
  const prop = calcularPropuesta(catalogo, { lineas: [{ sku: 'SIM-M365-02', cantidad: 120 }] });
  assert.equal(prop.totales.mensualSinIvaMxn, 28518);
});

test('Corrección: catalogService ya no escala todo por defecto', () => {
  // Antes, cualquier producto con texto en cuando_entra_arquitecto activaba "requiere".
  const esc = evaluarEscalamiento(['SIM-M365-03', 'SIM-BK-02'], {});
  assert.equal(esc.requiere, false);
  assert.ok(esc.revisar.length > 0, 'las condiciones por producto siguen visibles como "revisar"');
  const oracle = evaluarEscalamiento(['SIM-OCI-02'], { hechos: { oracleTB: 6 } });
  assert.equal(oracle.requiere, true);
  assert.equal(determinarTipoOportunidad(obtenerProductosPorSKUs(['SIM-OCI-02']), oracle), 'a la medida');
  assert.equal(determinarTipoOportunidad(obtenerProductosPorSKUs(['SIM-M365-03', 'SIM-BK-02']), esc), 'estándar');
});

test('Modo demo: cada caso recibe productos propios y todos existen en el catálogo', () => {
  const skus = new Set(catalogo.productos.map((p) => p.sku));
  const firmas = new Set();
  for (const caso of catalogo.casos_clientes) {
    const a = analizarSinIA(`Cliente: ${caso.mensaje_inicial}`, catalogo);
    assert.ok(a.compatibleProductSKUs.length > 0, `${caso.id} sin productos`);
    a.compatibleProductSKUs.forEach((s) => assert.ok(skus.has(s), `${s} no existe`));
    assert.ok(a.missingInformation.length > 0, `${caso.id} sin información faltante`);
    firmas.add(a.compatibleProductSKUs.join(','));
  }
  assert.ok(firmas.size >= 8, 'el demo ya no devuelve siempre lo mismo');
  const clinica = analizarSinIA('Cliente: Usamos correos de Gmail personales y se cifraron las computadoras.', catalogo);
  assert.ok(!clinica.compatibleProductSKUs.some((s) => s.startsWith('SIM-DC')), 'la clínica no recibe servidores');
});

test('Hechos: detecta regulación y Oracle; ignora negaciones y al vendedor', () => {
  assert.deepEqual(detectarHechos('Cliente: Tenemos que cumplir con la CNBV').requisitosRegulatorios, ['CNBV']);
  assert.equal(detectarHechos('Cliente: Base de datos Oracle de 6 TB').oracleTB, 6);
  assert.deepEqual(detectarHechos('Cliente: No guardamos expedientes de pacientes.').requisitosRegulatorios, []);
  assert.deepEqual(detectarHechos('Vendedor: ¿Manejan datos de salud?').requisitosRegulatorios, []);
});

test('Escalamiento puro: umbral por producto (Copilot > 500)', () => {
  const r = evaluarReglasEscalamiento(catalogo, [{ sku: 'SIM-M365-05', cantidad: 600 }], {});
  assert.equal(r.requiere, true);
  assert.equal(r.umbralesProducto[0].sku, 'SIM-M365-05');
});
