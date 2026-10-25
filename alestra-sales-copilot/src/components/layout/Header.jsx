/**
 * Header — barra superior con título de sección, breadcrumb y botón de menú (móvil).
 */
'use client';

import { usePathname } from 'next/navigation';
import { useMeeting } from '../../context/MeetingContext';
import styles from './Header.module.css';

const ROUTE_LABELS = {
  '/':          'Dashboard',
  '/meeting':   'Nueva Reunión',
  '/copilot':   'Copiloto',
  '/diagnosis': 'Diagnóstico',
  '/minutes':   'Minutas',
  '/proposal':  'Propuesta',
};

function getPageTitle(pathname) {
  // Coincidencia exacta primero
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];
  // Prefijo más largo que coincida
  const match = Object.keys(ROUTE_LABELS)
    .filter((r) => r !== '/' && pathname.startsWith(r))
    .sort((a, b) => b.length - a.length)[0];
  return match ? ROUTE_LABELS[match] : 'Alestra Sales Copilot';
}

export default function Header({ onMenuClick }) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);
  const { meeting } = useMeeting();
  const real = meeting?.analysisSource === 'gemini';

  return (
    <header className={styles.header}>
      {/* Botón hamburguesa — solo visible en móvil */}
      <button
        className={styles.menuBtn}
        onClick={onMenuClick}
        aria-label="Abrir menú de navegación"
        type="button"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {/* Título de la sección actual */}
      <div className={styles.titleArea}>
        <h1 className={styles.pageTitle}>{pageTitle}</h1>
      </div>

      {/* Indicador de estado: refleja la fuente del último análisis (source: "gemini" | "demo") */}
      <div className={styles.statusArea}>
        <span
          className={styles.demoPill}
          style={real ? { background: '#d1fae5', color: '#065f46', borderColor: '#6ee7b7' } : undefined}
          title={real ? 'Último análisis hecho con Gemini' : 'Sin API keys o sin análisis real — modo demostración'}
        >
          <span className={styles.demoDot} aria-hidden="true" style={real ? { background: '#10b981' } : undefined} />
          {real ? 'Gemini' : 'Demo'}
        </span>
      </div>
    </header>
  );
}
