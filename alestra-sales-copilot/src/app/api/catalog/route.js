/**
 * GET /api/catalog
 *
 * Devuelve productos y datos del catálogo simulado.
 * Solo lee desde catalog.json — nunca genera ni modifica datos.
 *
 * Query params (todos opcionales):
 *   familia   string  — filtra por ID de familia (ej. DC, M365, BK)
 *   sku       string  — devuelve un producto específico por SKU
 *   tipo      string  — filtra por tipo: estándar | configurable | a la medida
 *   section   string  — sección a devolver: productos | paquetes | familias |
 *                        condiciones | reglas | casos | todo
 *                        default: productos
 *
 * Respuestas:
 *   200 { data: any, total?: number, disclaimer: string }
 *   400 { error: string, code: string }
 *   404 { error: string, code: string }
 *   500 { error: string, code: string }
 */

import {
  obtenerTodosLosProductos,
  obtenerProductosPorSKUs,
  buscarProductosPorFamilia,
  obtenerCondicionesComerciales,
  obtenerCasosClientes,
  obtenerCatalogo,
} from '../../../services/catalogService.js';
import { CATALOG_DISCLAIMER } from '../../../lib/constants.js';

export const runtime = 'nodejs';

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const familia  = searchParams.get('familia')?.trim().toUpperCase() ?? '';
  const sku      = searchParams.get('sku')?.trim().toUpperCase() ?? '';
  const tipo     = searchParams.get('tipo')?.trim().toLowerCase() ?? '';
  const section  = searchParams.get('section')?.trim().toLowerCase() || 'productos';

  try {
    let data;
    let total;

    switch (section) {
      case 'todo': {
        // Catálogo completo — omitir el aviso interno (está en CATALOG_DISCLAIMER)
        const cat = obtenerCatalogo();
        data = {
          familias:               cat.familias,
          productos:              cat.productos,
          paquetes:               cat.paquetes,
          condiciones_comerciales: cat.condiciones_comerciales,
          reglas_escalamiento:    cat.reglas_escalamiento,
        };
        break;
      }

      case 'paquetes': {
        data = obtenerCatalogo().paquetes ?? [];
        total = data.length;
        break;
      }

      case 'familias': {
        data = obtenerCatalogo().familias ?? [];
        total = data.length;
        break;
      }

      case 'condiciones': {
        data = obtenerCondicionesComerciales();
        total = data.length;
        break;
      }

      case 'reglas': {
        data = obtenerCatalogo().reglas_escalamiento ?? [];
        total = data.length;
        break;
      }

      case 'casos': {
        data = obtenerCasosClientes();
        total = data.length;
        break;
      }

      case 'productos':
      default: {
        // SKU específico tiene prioridad
        if (sku) {
          const encontrados = obtenerProductosPorSKUs([sku]);
          if (encontrados.length === 0) {
            return Response.json(
              { error: `SKU '${sku}' no encontrado en el catálogo.`, code: 'CATALOG_NO_MATCH' },
              { status: 404 },
            );
          }
          data = encontrados[0];
          break;
        }

        // Filtrar por familia
        let productos = familia
          ? buscarProductosPorFamilia(familia)
          : obtenerTodosLosProductos();

        // Filtrar por tipo
        if (tipo) {
          const tiposValidos = ['estándar', 'configurable', 'a la medida'];
          if (!tiposValidos.some((t) => t.startsWith(tipo))) {
            return Response.json(
              { error: `Tipo '${tipo}' no válido. Valores permitidos: estándar, configurable, a la medida.`, code: 'INVALID_PARAM' },
              { status: 400 },
            );
          }
          productos = productos.filter((p) => p.tipo.toLowerCase().includes(tipo));
        }

        data = productos;
        total = productos.length;
        break;
      }
    }

    const respuesta = { data, disclaimer: CATALOG_DISCLAIMER };
    if (total !== undefined) respuesta.total = total;

    return Response.json(respuesta);
  } catch (err) {
    return Response.json(
      { error: `Error al leer el catálogo: ${err.message}`, code: 'CATALOG_ERROR' },
      { status: 500 },
    );
  }
}
