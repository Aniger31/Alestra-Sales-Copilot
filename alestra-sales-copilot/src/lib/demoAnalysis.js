/**
 * demoAnalysis.js — análisis de DEMOSTRACIÓN sin IA (sin claves o con la cuota agotada).
 *
 * Antes, el modo demo devolvía siempre el mismo análisis (Aceros del Valle) sin importar
 * la conversación. Este módulo busca por palabras en el catálogo real y detecta hechos con
 * expresiones regulares, así cada caso de ejemplo obtiene productos coherentes.
 * Todo resultado se sigue marcando con source: "demo".
 *
 * Funciones puras: reciben el catálogo como parámetro (no leen archivos).
 */

const FAMILIAS = {
  M365: /(correo|gmail|hotmail|outlook|teams|office|copilot|licencia|microsoft 365)/i,
  BK: /(respald|backup|ransomware|cifr|borrar|virus|hacke|guardar(?:los)? \d+ a[ñn]os|sat nos pide)/i,
  DC: /(servidor(?:es)? (?:en|de la)|cuarto|site\b|se nos fue la luz|rack|data ?center|calor|corte[s]? de luz|\berp\b)/i,
  AWS: /\b(aws|amazon)\b/i,
  AZ: /(azure|escritorio[s]? virtual|laboratorio)/i,
  OCI: /\boracle\b/i,
  IA: /(whatsapp|mensajes|asistente|chatbot|preguntas frecuentes|reserv|dudas de (?:nuestros|los) procedimientos)/i,
};

// Producto de entrada cuando se detecta la familia y no hay mejor coincidencia.
const ENTRADA = {
  M365: ['SIM-M365-03'], BK: ['SIM-BK-01'], DC: ['SIM-DC-03', 'SIM-DC-07'], AWS: ['SIM-AWS-01', 'SIM-AWS-04'],
  AZ: ['SIM-AZ-02'], OCI: ['SIM-OCI-02'], IA: ['SIM-IA-01'],
};
const LICENCIAS = ['SIM-M365-01', 'SIM-M365-02', 'SIM-M365-03', 'SIM-M365-04'];
const NEGACION = /\bno\s+(guard|manej|tenemos|usamos|almacen|contamos|requerimos|necesitamos|aplica)/i;
const VACIAS = new Set('de la el los las y o a en un una para por con que se del al es no nos mas muy lo su sus hoy ya'.split(' '));

const normalizar = (t) => String(t ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ\s]/g, ' ');
const raiz = (w) => (w.length > 5 && w.endsWith('es') ? w.slice(0, -2) : w.length > 4 && w.endsWith('s') ? w.slice(0, -1) : w);
const tokens = (t) => normalizar(t).split(/\s+/).filter((w) => w.length > 2 && !VACIAS.has(w)).map(raiz);
const frases = (t) => String(t).split(/(?<=[.!?])\s+|\n+/).map((x) => x.trim()).filter(Boolean);

/** Quita las líneas del vendedor y las frases negadas ("no guardamos expedientes"). */
function textoDelCliente(transcripcion) {
  return String(transcripcion)
    .split('\n')
    .filter((l) => !/^\s*(vendedor|ejecutivo)\s*:/i.test(l))
    .map((l) => l.replace(/^\s*(cliente|grabación)\s*:\s*/i, ''))
    .join('\n');
}

/**
 * Detecta hechos que activan reglas de escalamiento. Es conservador y el vendedor los
 * confirma en Diagnóstico; se usa tanto en modo demo como junto al análisis de Gemini.
 */
export function detectarHechos(transcripcion) {
  const t = frases(textoDelCliente(transcripcion)).filter((f) => !NEGACION.test(f)).join(' ').toLowerCase();
  const reg = [];
  if (/cnbv/.test(t)) reg.push('CNBV');
  if (/(datos de salud|expediente|pacientes|nom-0)/.test(t)) reg.push('salud');
  if (/(datos personales sensibles|ley de protecci)/.test(t)) reg.push('datos_personales_sensibles');
  if (/(pagos? con tarjeta|tarjetas? de cr[eé]dito|\bpci\b)/.test(t)) reg.push('pagos_tarjeta');
  const tb = t.match(/oracle[^.]{0,40}?(\d+(?:[.,]\d+)?)\s*tb|(\d+(?:[.,]\d+)?)\s*tb[^.]{0,40}oracle/);
  const nubes = /(azure|aws|amazon|oci|nube)/.test(t);
  const propio = /(data ?center|site\b|servidores propios|nuestro data)/.test(t);
  return {
    requisitosRegulatorios: reg,
    integracionSistemasInternos: /(conect|integr)\w*[^.]{0,40}\b(erp|crm|sistema)/.test(t) ? ['Sistema interno mencionado'] : [],
    aplicacionesSinDocumentar: /sin documenta/.test(t),
    solucionHibrida: nubes && propio,
    rpoMinutos: null,
    rtoHoras: null,
    disponibilidadPct: null,
    oracleTB: tb ? Number((tb[1] ?? tb[2]).replace(',', '.')) : null,
    oracleRacODataGuard: /\brac\b|data guard/.test(t),
    requiereGpu: /(gpu|autocad|render|dise[ñn]o 3d)/.test(t),
    disenoFormalSolicitado: /(documento t[eé]cnico|dise[ñn]o de arquitectura)/.test(t),
  };
}

function buscarEnFamilia(catalogo, texto, familia, limite = 2) {
  const q = [...new Set(tokens(texto))];
  const fam = (catalogo.familias ?? []).find((f) => f.id === familia);
  return (catalogo.productos ?? [])
    .filter((p) => p.familia === familia)
    .map((p) => {
      const palabras = new Set(tokens([p.nombre, p.descripcion, p.senal_del_cliente, fam?.nombre, fam?.problemas_que_resuelve].join(' ')));
      return { p, puntos: q.filter((w) => palabras.has(w)).length };
    })
    .filter((r) => r.puntos >= 2)
    .sort((a, b) => b.puntos - a.puntos)
    .slice(0, limite)
    .map((r) => r.p);
}

/**
 * Devuelve un análisis con la MISMA forma que validarAnalisis() de Gemini.
 * @param {string} transcripcion
 * @param {object} catalogo  — catálogo completo (familias, productos, casos_clientes)
 */
export function analizarSinIA(transcripcion, catalogo) {
  const texto = textoDelCliente(transcripcion);
  const util = frases(texto).filter((f) => !NEGACION.test(f)).join(' ');
  const familias = Object.entries(FAMILIAS).filter(([, re]) => re.test(util)).map(([f]) => f);
  const getProducto = (sku) => (catalogo.productos ?? []).find((p) => p.sku === sku);

  const elegidos = [];
  for (const f of familias) {
    const top = buscarEnFamilia(catalogo, util, f);
    for (const p of top.length ? top : ENTRADA[f].map(getProducto).filter(Boolean)) {
      if (!elegidos.includes(p.sku)) elegidos.push(p.sku);
    }
  }
  // Una sola licencia base de Microsoft 365 (mezclarlas obliga a un arquitecto)
  const lic = elegidos.filter((s) => LICENCIAS.includes(s));
  lic.slice(1).forEach((s) => elegidos.splice(elegidos.indexOf(s), 1));
  // Agregar el prerrequisito cuando falta (ej. Copilot necesita licencia base)
  for (const sku of [...elegidos]) {
    const req = getProducto(sku)?.requiere_alguno_de ?? [];
    if (req.length && !req.some((r) => elegidos.includes(r))) elegidos.push(req[0]);
  }

  const productos = elegidos.map(getProducto).filter(Boolean);
  const nombresFam = familias.map((f) => (catalogo.familias ?? []).find((x) => x.id === f)?.nombre).filter(Boolean);
  const necesidades = frases(texto).filter((f) => !NEGACION.test(f) && Object.values(FAMILIAS).some((re) => re.test(f))).slice(0, 5);
  const preguntas = [...new Set(productos.flatMap((p) => p.preguntas_clave ?? []))].slice(0, 6);

  // Si la conversación corresponde a un caso de ejemplo, usar su "información que falta"
  const caso = (catalogo.casos_clientes ?? []).find((c) => normalizar(texto).includes(normalizar(c.mensaje_inicial).slice(0, 60)));
  const faltante = caso ? caso.informacion_que_falta.split(/;\s*/).filter(Boolean) : productos.map((p) => `Confirmar: ${p.cuando_entra_arquitecto}`).filter((x) => !x.endsWith(': ')).slice(0, 4);

  return {
    summary: nombresFam.length
      ? `[DEMO] El cliente muestra necesidades de ${nombresFam.join(', ')}. Productos sugeridos por coincidencia de palabras con el catálogo; revísalos.`
      : '[DEMO] No se detectaron necesidades que coincidan con el catálogo. Agrega más detalle de la conversación.',
    needs: necesidades,
    technicalRequirements: [],
    commercialRequirements: [],
    missingInformation: faltante,
    suggestedQuestions: preguntas,
    compatibleProductSKUs: productos.map((p) => p.sku),
    nextSteps: productos.length
      ? ['Confirmar cantidades con el cliente', 'Revisar el diagnóstico y las reglas de escalamiento', 'Generar la propuesta preliminar']
      : ['Completar el levantamiento con más detalle'],
    opportunityType: 'insuficiente',
  };
}
