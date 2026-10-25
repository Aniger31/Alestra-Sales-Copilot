/**
 * PackageCard — paquete del catálogo (descuento 8 %): aplicado o a pocos productos de aplicar.
 */
'use client';

import Badge from '../ui/Badge';
import Button from '../ui/Button';
import styles from './Diagnosis.module.css';

export default function PackageCard({ paquete, nombres, aplicado, faltan = [], onAgregarFaltantes }) {
  return (
    <div className={[styles.package, aplicado ? styles.packageOn : ''].filter(Boolean).join(' ')}>
      <div className={styles.packageHead}>
        <strong>{paquete.nombre}</strong>
        <Badge variant={aplicado ? 'success' : 'accent'}>{aplicado ? `Aplicado · −${paquete.descuento_pct}%` : `−${paquete.descuento_pct}%`}</Badge>
      </div>
      <p className={styles.small}>{paquete.para_quien}</p>
      <p className={styles.small}>{paquete.productos.map((s) => nombres[s] ?? s).join(' + ')}</p>
      {!aplicado && faltan.length > 0 && (
        <div className={styles.packageFoot}>
          <span className={styles.small}>Falta: {faltan.map((s) => nombres[s] ?? s).join(', ')}</span>
          <Button size="sm" variant="secondary" onClick={onAgregarFaltantes}>Agregar y aplicar</Button>
        </div>
      )}
    </div>
  );
}
