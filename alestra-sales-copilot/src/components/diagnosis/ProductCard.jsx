/**
 * ProductCard — producto recomendado con datos SOLO del catálogo:
 * SKU, nombre, familia, tipo, precio, cantidad editable y estado calculado.
 */
'use client';

import Badge from '../ui/Badge';
import { dinero, ESTADO_LINEA, TIPO_PRODUCTO } from '../../lib/formatters';
import { parametrosDeProducto, productoSinCantidad, PORCENTAJE_DEL_CONSUMO } from '../../lib/commercialRules';
import styles from './Diagnosis.module.css';

export default function ProductCard({ producto, familia, linea, cantidad, parametros = {}, empleados, onCantidad, onParametro, onQuitar }) {
  const estado = ESTADO_LINEA[linea?.estado] ?? ESTADO_LINEA.pendiente;
  const sinCantidad = productoSinCantidad(producto);
  const extras = parametrosDeProducto(producto);
  const pctConsumo = PORCENTAJE_DEL_CONSUMO[producto.sku];
  const precio = pctConsumo
    ? `${pctConsumo.pct}% del consumo · mínimo ${dinero(pctConsumo.minimoMxn, false)} al mes`
    : producto.precio_mensual_mxn != null
      ? `${dinero(producto.precio_mensual_mxn, false)} ${producto.unidad_cobro}`
      : producto.cargo_unico_mxn != null
        ? `${dinero(producto.cargo_unico_mxn, false)} · ${producto.unidad_cobro}`
        : producto.tipo === 'a la medida' ? 'Sin precio de lista' : producto.unidad_cobro;
  const idCant = `cant-${producto.sku}`;

  return (
    <article className={styles.product}>
      <header className={styles.productHead}>
        <div>
          <p className={styles.sku}>{producto.sku} · {familia ?? producto.familia}</p>
          <h4 className={styles.productName}>{producto.nombre}</h4>
        </div>
        <div className={styles.badges}>
          <Badge variant={TIPO_PRODUCTO[producto.tipo] ?? 'default'}>{producto.tipo}</Badge>
          <Badge variant={estado.variant}>{estado.etiqueta}</Badge>
        </div>
      </header>

      <p className={styles.desc}>{producto.descripcion}</p>

      <div className={styles.productGrid}>
        <div>
          <span className={styles.k}>Precio de lista</span>
          <span className={styles.v}>{precio}</span>
          {producto.precio_mensual_mxn != null && producto.cargo_unico_mxn != null && (
            <span className={styles.small}>+ cargo único {dinero(producto.cargo_unico_mxn, false)}</span>
          )}
        </div>
        {!sinCantidad && (
          <div>
            <label className={styles.k} htmlFor={idCant}>
              Cantidad{producto.cantidad_minima ? ` (mín. ${producto.cantidad_minima}${producto.cantidad_maxima ? `, máx. ${producto.cantidad_maxima}` : ''})` : ''}
            </label>
            <input
              id={idCant}
              type="number"
              min="0"
              className={styles.input}
              value={cantidad ?? ''}
              placeholder={producto.unidad_cobro === 'por usuario al mes' && empleados ? `¿${empleados}?` : '¿?'}
              onChange={(e) => onCantidad(e.target.value === '' ? null : Number(e.target.value))}
            />
          </div>
        )}
        {extras.map((x) => (
          <div key={x.clave}>
            <label className={styles.k} htmlFor={`${idCant}-${x.clave}`}>{x.etiqueta}</label>
            <input
              id={`${idCant}-${x.clave}`}
              type="number"
              min="0"
              step="any"
              className={styles.input}
              value={parametros[x.clave] ?? ''}
              onChange={(e) => onParametro(x.clave, e.target.value === '' ? undefined : Number(e.target.value))}
            />
          </div>
        ))}
        <div>
          <span className={styles.k}>Mensual de referencia</span>
          <span className={styles.v}>
            {linea && linea.mensualBrutoMxn + linea.mensualConsumoMxn > 0 ? dinero(linea.mensualBrutoMxn + linea.mensualConsumoMxn) : '—'}
          </span>
        </div>
      </div>

      {linea?.notas?.length > 0 && <p className={styles.note}>{linea.notas.join(' ')}</p>}

      <footer className={styles.productFoot}>
        <span className={styles.small}>
          <strong>Señal típica:</strong> “{producto.senal_del_cliente}”
          {producto.cuando_entra_arquitecto && <> · <strong>Arquitecto si:</strong> {producto.cuando_entra_arquitecto}</>}
        </span>
        <button type="button" className={styles.remove} onClick={onQuitar} aria-label={`Quitar ${producto.nombre}`}>Quitar</button>
      </footer>
    </article>
  );
}
