/**
 * formatters.js — formato de moneda, fechas y etiquetas para la UI (cliente).
 */

const MXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });
const MXN0 = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

export const dinero = (n, decimales = true) => (typeof n === 'number' && Number.isFinite(n) ? (decimales ? MXN : MXN0).format(n) : '—');

export const fecha = (iso) =>
  iso ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

/** Variante de <Badge> para cada tipo de oportunidad. */
export const TIPO_OPORTUNIDAD = {
  'estándar': { variant: 'success', etiqueta: 'Estándar', detalle: 'Precio de lista: el vendedor cotiza solo.' },
  configurable: { variant: 'info', etiqueta: 'Configurable', detalle: 'Productos de catálogo; hay que dimensionar cantidades.' },
  mixto: { variant: 'warning', etiqueta: 'Mixto', detalle: 'Parte se cotiza hoy; parte la revisa un arquitecto.' },
  'a la medida': { variant: 'error', etiqueta: 'A la medida', detalle: 'Se requiere revisión de un arquitecto de soluciones.' },
  insuficiente: { variant: 'default', etiqueta: 'Información insuficiente', detalle: 'Faltan datos para recomendar productos.' },
};

export const ESTADO_LINEA = {
  cotizable: { variant: 'success', etiqueta: 'Cotizable' },
  pendiente: { variant: 'warning', etiqueta: 'Por confirmar' },
  invalida: { variant: 'error', etiqueta: 'Revisar cantidad' },
  requiere_arquitecto: { variant: 'accent', etiqueta: 'Arquitecto' },
};

export const TIPO_PRODUCTO = {
  'estándar': 'success',
  configurable: 'info',
  'a la medida': 'accent',
};
