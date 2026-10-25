/**
 * documentService.js — generación de documentos Word con la biblioteca docx.
 * Solo se ejecuta en el servidor (Next.js Route Handlers).
 * Produce archivos .docx válidos compatibles con Microsoft Word.
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  WidthType,
  BorderStyle,
} from 'docx';
import { ERROR_CODES, ERROR_MESSAGES, CATALOG_DISCLAIMER } from '../lib/constants.js';

// ─── Paleta de colores (hex sin #) ────────────────────────────────────────────
const COLOR = {
  PRIMARY: '142B4D',
  ACCENT: '7357E8',
  TEXT: '1F2937',
  MUTED: '6B7280',
  WHITE: 'FFFFFF',
  BORDER: 'E5E7EB',
};

// ─── Funciones exportadas ──────────────────────────────────────────────────────

/**
 * Genera un documento Word (.docx) a partir de una minuta estructurada.
 *
 * @param {object} minuta — objeto validado con la estructura completa de la minuta
 * @returns {Promise<Buffer>}
 * @throws {AppError}
 */
export async function generarDocumentoWord(minuta) {
  try {
    const doc = construirDocumentoMinuta(minuta);
    const buffer = await Packer.toBuffer(doc);
    return buffer;
  } catch (err) {
    const error = new Error(
      `${ERROR_MESSAGES[ERROR_CODES.DOCUMENT_GENERATION_FAILED]}: ${err.message}`,
    );
    error.code = ERROR_CODES.DOCUMENT_GENERATION_FAILED;
    throw error;
  }
}

/**
 * Genera un documento Word (.docx) para una propuesta comercial preliminar.
 *
 * @param {object} propuesta — { titulo, cliente, empresa, productos[], condiciones, resumen }
 * @returns {Promise<Buffer>}
 * @throws {AppError}
 */
export async function generarDocumentoPropuesta(propuesta) {
  try {
    const doc = construirDocumentoPropuesta(propuesta);
    const buffer = await Packer.toBuffer(doc);
    return buffer;
  } catch (err) {
    const error = new Error(
      `${ERROR_MESSAGES[ERROR_CODES.DOCUMENT_GENERATION_FAILED]}: ${err.message}`,
    );
    error.code = ERROR_CODES.DOCUMENT_GENERATION_FAILED;
    throw error;
  }
}

// ─── Constructores de documentos ──────────────────────────────────────────────

function construirDocumentoMinuta(minuta) {
  const secciones = [];

  // ── Encabezado / título ──
  secciones.push(
    parrafoTitulo(minuta.title || 'Minuta de Reunión Comercial'),
  );

  // ── Línea horizontal visual (párrafo con borde inferior) ──
  secciones.push(separador());

  // ── Metadata de la reunión ──
  if (minuta.objective) {
    secciones.push(parrafoSeccion('Objetivo'));
    secciones.push(parrafoTexto(minuta.objective));
  }

  // ── Participantes ──
  if (minuta.participants?.length > 0) {
    secciones.push(parrafoSeccion('Participantes'));
    minuta.participants.forEach((p) => {
      const linea = [p.name || '(pendiente)', p.company, p.role]
        .filter(Boolean)
        .join(' — ');
      secciones.push(parrafoListItem(linea));
    });
  }

  // ── Temas tratados ──
  if (minuta.topics?.length > 0) {
    secciones.push(parrafoSeccion('Temas Tratados'));
    minuta.topics.forEach((t) => secciones.push(parrafoListItem(t)));
  }

  // ── Resumen ejecutivo ──
  if (minuta.summary) {
    secciones.push(parrafoSeccion('Resumen Ejecutivo'));
    secciones.push(parrafoTexto(minuta.summary));
  }

  // ── Decisiones ──
  if (minuta.decisions?.length > 0) {
    secciones.push(parrafoSeccion('Decisiones'));
    minuta.decisions.forEach((d) => secciones.push(parrafoListItem(d)));
  }

  // ── Acuerdos ──
  if (minuta.agreements?.length > 0) {
    secciones.push(parrafoSeccion('Acuerdos'));
    minuta.agreements.forEach((a) => secciones.push(parrafoListItem(a)));
  }

  // ── Tabla de tareas ──
  if (minuta.tasks?.length > 0) {
    secciones.push(parrafoSeccion('Tabla de Tareas'));
    secciones.push(construirTablaTaskes(minuta.tasks));
  }

  // ── Pendientes ──
  if (minuta.pendingItems?.length > 0) {
    secciones.push(parrafoSeccion('Pendientes de Confirmación'));
    minuta.pendingItems.forEach((pi) => secciones.push(parrafoListItem(`⚠ ${pi}`)));
  }

  // ── Próximos pasos ──
  if (minuta.nextSteps?.length > 0) {
    secciones.push(parrafoSeccion('Próximos Pasos'));
    minuta.nextSteps.forEach((ns) => secciones.push(parrafoListItem(ns)));
  }

  // ── Pie de página / disclaimer ──
  secciones.push(separador());
  secciones.push(parrafoDisclaimer(CATALOG_DISCLAIMER));
  secciones.push(parrafoDisclaimer('Documento generado por Alestra Sales Copilot — Prototipo académico.'));

  return new Document({
    creator: 'Alestra Sales Copilot',
    title: minuta.title || 'Minuta de Reunión',
    description: 'Minuta generada automáticamente — datos simulados',
    sections: [{ children: secciones }],
  });
}

function construirDocumentoPropuesta(propuesta) {
  const secciones = [];

  secciones.push(parrafoTitulo(propuesta.titulo || 'Propuesta Comercial Preliminar'));
  secciones.push(separador());

  // Datos del cliente
  if (propuesta.empresa) {
    secciones.push(parrafoSeccion('Datos del Cliente'));
    if (propuesta.cliente) secciones.push(parrafoTexto(`Contacto: ${propuesta.cliente}`));
    secciones.push(parrafoTexto(`Empresa: ${propuesta.empresa}`));
  }

  // Resumen de la solución
  if (propuesta.resumen) {
    secciones.push(parrafoSeccion('Resumen de la Solución Propuesta'));
    secciones.push(parrafoTexto(propuesta.resumen));
  }

  // Propuesta económica calculada con el catálogo (Tarea 10). Si no viene, se usa la tabla simple.
  if (propuesta.calculo) {
    secciones.push(...seccionesCalculo(propuesta.calculo));
  } else if (propuesta.productos?.length > 0) {
    secciones.push(parrafoSeccion('Productos y Servicios'));
    secciones.push(construirTablaProductos(propuesta.productos));
  }

  // Condiciones comerciales
  if (propuesta.condiciones) {
    secciones.push(parrafoSeccion('Condiciones Comerciales'));
    const lista = Array.isArray(propuesta.condiciones) ? propuesta.condiciones : [propuesta.condiciones];
    lista.forEach((c) => secciones.push(lista.length > 1 ? parrafoListItem(c) : parrafoTexto(c)));
  }

  secciones.push(separador());
  secciones.push(parrafoDisclaimer(CATALOG_DISCLAIMER));
  secciones.push(parrafoDisclaimer('Vigencia de esta propuesta: 30 días naturales.'));
  secciones.push(parrafoDisclaimer('Precios en MXN sin IVA. IVA vigente: 16%.'));
  secciones.push(parrafoDisclaimer('Documento generado por Alestra Sales Copilot — Prototipo académico.'));

  return new Document({
    creator: 'Alestra Sales Copilot',
    title: propuesta.titulo || 'Propuesta Comercial',
    description: 'Propuesta generada automáticamente — datos simulados',
    sections: [{ children: secciones }],
  });
}

// ─── Propuesta económica (Tarea 10) ────────────────────────────────────────────

const mxn = (n) => (typeof n === 'number' ? `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—');

function seccionesCalculo(calc) {
  const out = [];
  const cot = (calc.lineas ?? []).filter((l) => l.estado === 'cotizable');
  const otras = (calc.lineas ?? []).filter((l) => l.estado !== 'cotizable');

  out.push(parrafoSeccion('Productos y Servicios'));
  out.push(parrafoTexto(`Plazo del contrato: ${calc.plazoMeses} meses · Vigente hasta ${calc.vigenciaHasta}`));
  if (cot.length) {
    out.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ tableHeader: true, children: ['SKU', 'Producto', 'Cant.', 'Precio unit.', 'Desc.', 'Mensual', 'Cargo único'].map(celdaEncabezado) }),
        ...cot.map((l) => new TableRow({ children: [
          celdaDato(l.sku),
          celdaDato(l.notas?.length ? `${l.nombre} — ${l.notas.join(' ')}` : l.nombre),
          celdaDato(l.cantidad ?? '—'),
          celdaDato(l.precioUnitarioMensualMxn != null ? mxn(l.precioUnitarioMensualMxn) : 'Consumo'),
          celdaDato(l.descuentoPct ? `${l.descuentoPct}%` : '—'),
          celdaDato(mxn(l.mensualNetoMxn)),
          celdaDato(l.cargoUnicoMxn ? mxn(l.cargoUnicoMxn) : '—'),
        ] })),
      ],
    }));
  } else {
    out.push(parrafoTexto('Todavía no hay productos con cantidad confirmada para cotizar.'));
  }

  const tt = calc.totales ?? {};
  out.push(parrafoSeccion('Totales'));
  out.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: ['Concepto', 'Sin IVA', 'Con IVA 16%'].map(celdaEncabezado) }),
      new TableRow({ children: [celdaDato('Mensualidad'), celdaDato(mxn(tt.mensualSinIvaMxn)), celdaDato(mxn(tt.mensualConIvaMxn))] }),
      new TableRow({ children: [celdaDato('Cargos únicos'), celdaDato(mxn(tt.cargoUnicoSinIvaMxn)), celdaDato(mxn(tt.cargoUnicoConIvaMxn))] }),
      new TableRow({ children: [celdaDato('Cargos únicos en 3 mensualidades'), celdaDato(''), celdaDato(mxn(tt.cargoUnicoEnMensualidadesMxn))] }),
      new TableRow({ children: [celdaDato(`Valor estimado del contrato (${calc.plazoMeses} meses)`), celdaDato(mxn(tt.valorContratoSinIvaMxn)), celdaDato('')] }),
    ],
  }));
  if (calc.paquetesAplicados?.length) {
    out.push(parrafoTexto(`Paquetes aplicados: ${calc.paquetesAplicados.map((p) => `${p.id} ${p.nombre} (−${p.descuentoPct}%)`).join(', ')}.`));
  }

  if (calc.escalamiento?.requiere || otras.some((l) => l.estado === 'requiere_arquitecto')) {
    out.push(parrafoSeccion('Revisión de un arquitecto de soluciones'));
    out.push(parrafoTexto('Estos puntos no tienen precio de lista o rebasan los criterios estándar. Se entregan con la información ya levantada para que el cliente no repita su explicación.'));
    otras.filter((l) => l.estado === 'requiere_arquitecto').forEach((l) => out.push(parrafoListItem(`${l.nombre} (${l.sku}): ${l.notas.join(' ')}`)));
    (calc.escalamiento?.razones ?? []).forEach((r) => out.push(parrafoListItem(r)));
  }
  const pend = otras.filter((l) => l.estado === 'pendiente' || l.estado === 'invalida');
  if (pend.length) {
    out.push(parrafoSeccion('Información por confirmar'));
    pend.forEach((l) => out.push(parrafoListItem(`⚠ ${l.nombre}: ${l.notas.join(' ')}`)));
  }
  if (calc.requiereAutorizacionGerente) {
    out.push(parrafoTexto('⚠ El descuento total supera 10%: requiere autorización del gerente.'));
  }
  return out;
}

// ─── Constructores de tablas ───────────────────────────────────────────────────

function construirTablaTaskes(tasks) {
  const encabezado = new TableRow({
    children: [
      celdaEncabezado('Descripción'),
      celdaEncabezado('Responsable'),
      celdaEncabezado('Fecha Límite'),
      celdaEncabezado('Estado'),
    ],
    tableHeader: true,
  });

  const filas = tasks.map(
    (t) =>
      new TableRow({
        children: [
          celdaDato(t.description || ''),
          celdaDato(t.responsible || '⚠ Sin asignar'),
          celdaDato(t.dueDate || '⚠ Sin fecha'),
          celdaDato(t.status === 'done' ? '✓ Completada' : 'Pendiente'),
        ],
      }),
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [encabezado, ...filas],
  });
}

function construirTablaProductos(productos) {
  const encabezado = new TableRow({
    children: [
      celdaEncabezado('SKU'),
      celdaEncabezado('Producto'),
      celdaEncabezado('Tipo'),
      celdaEncabezado('Precio Mensual (MXN)'),
    ],
    tableHeader: true,
  });

  const filas = productos.map(
    (p) =>
      new TableRow({
        children: [
          celdaDato(p.sku || ''),
          celdaDato(p.nombre || ''),
          celdaDato(p.tipo || ''),
          celdaDato(
            typeof p.precio_mensual_mxn === 'number'
              ? `$${p.precio_mensual_mxn.toLocaleString('es-MX')}`
              : 'A cotizar',
          ),
        ],
      }),
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [encabezado, ...filas],
  });
}

// ─── Helpers de párrafos ───────────────────────────────────────────────────────

function parrafoTitulo(texto) {
  return new Paragraph({
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.CENTER,
    spacing: { after: 240 },
    children: [
      new TextRun({
        text: texto,
        bold: true,
        size: 48,       // 24pt
        color: COLOR.PRIMARY,
      }),
    ],
  });
}

function parrafoSeccion(texto) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 120 },
    children: [
      new TextRun({
        text: texto,
        bold: true,
        size: 28,       // 14pt
        color: COLOR.PRIMARY,
      }),
    ],
  });
}

function parrafoTexto(texto) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({
        text: texto || '',
        size: 24,       // 12pt
        color: COLOR.TEXT,
      }),
    ],
  });
}

function parrafoListItem(texto) {
  return new Paragraph({
    indent: { left: 360 },
    spacing: { after: 80 },
    children: [
      new TextRun({ text: '• ', size: 24, color: COLOR.ACCENT }),
      new TextRun({ text: texto || '', size: 24, color: COLOR.TEXT }),
    ],
  });
}

function parrafoDisclaimer(texto) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 80, after: 40 },
    children: [
      new TextRun({
        text: texto || '',
        size: 18,       // 9pt
        color: COLOR.MUTED,
        italics: true,
      }),
    ],
  });
}

function separador() {
  return new Paragraph({
    spacing: { before: 160, after: 160 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: COLOR.BORDER },
    },
    children: [],
  });
}

function celdaEncabezado(texto) {
  return new TableCell({
    shading: { fill: COLOR.PRIMARY },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: texto,
            bold: true,
            size: 22,
            color: COLOR.WHITE,
          }),
        ],
      }),
    ],
  });
}

function celdaDato(texto) {
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: String(texto),
            size: 22,
            color: COLOR.TEXT,
          }),
        ],
      }),
    ],
  });
}
