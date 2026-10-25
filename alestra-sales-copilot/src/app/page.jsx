/**
 * Dashboard — página principal.
 * Muestra estadísticas de la sesión, reunión activa (si existe) y accesos rápidos.
 * Incluye carga de casos ficticios del catálogo para demostración.
 * 'use client' porque necesita acceder a MeetingContext.
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMeeting } from '../context/MeetingContext';
import MeetingCard from '../components/meeting/MeetingCard';
import StatsCard from '../components/meeting/StatsCard';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import styles from '../styles/dashboard.module.css';

// Casos ficticios del catálogo disponibles para demostración rápida.
// IMPORTANTE: estos son datos SIMULADOS del Hackathon Alestra, no clientes reales.
// Se cargan los 10 casos desde GET /api/catalog?section=casos; esta lista es solo respaldo.
const DEMO_CASES = [
  { id: 'CASO-01', company: 'Clínica Dental Sonrisa Norte', industry: 'Salud',                  employees: '25',   message: 'Usamos correos de Gmail personales y el mes pasado una recepcionista abrió un archivo y se cifraron las computadoras.' },
  { id: 'CASO-02', company: 'Aceros del Valle',            industry: 'Manufactura',              employees: '180',  message: 'Nuestro ERP corre en dos servidores en un cuarto de la planta. Se nos fue la luz dos veces este año y paramos la operación.' },
  { id: 'CASO-03', company: 'PagoFácil MX',                industry: 'Fintech',                  employees: '40',   message: 'La factura de AWS nos subió 60% en seis meses y nadie sabe por qué. Además tenemos que cumplir con la CNBV.' },
  { id: 'CASO-04', company: 'Universidad del Noreste',      industry: 'Educación',                employees: '1200', message: 'Queremos que maestros y personal tengan correo y Teams, y escritorios virtuales para los laboratorios de cómputo.' },
  { id: 'CASO-05', company: 'Tacos El Güero',              industry: 'Restaurantes',             employees: '600',  message: 'Tenemos 45 sucursales y recibimos cientos de WhatsApps al día preguntando horarios, menú y para reservar.' },
];

const QUICK_ACTIONS = [
  { label: 'Nueva Reunión',    href: '/meeting',   icon: '＋', desc: 'Registra un cliente y comienza la captura' },
  { label: 'Copiloto',         href: '/copilot',   icon: '🎙', desc: 'Transcribe y analiza una conversación' },
  { label: 'Ver Diagnóstico',  href: '/diagnosis', icon: '📊', desc: 'Revisa recomendaciones del catálogo' },
];

export default function DashboardPage() {
  const router = useRouter();
  const { meeting, startNewMeeting, isHydrated, meetingHistory, switchMeeting, deleteFromHistory } = useMeeting();

  const hasActiveMeeting = isHydrated && meeting.id !== null;
  const [casos, setCasos] = useState(DEMO_CASES);

  useEffect(() => {
    let vivo = true;
    fetch('/api/catalog?section=casos')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((json) => {
        if (!vivo || !Array.isArray(json.data) || !json.data.length) return;
        setCasos(json.data.map((c) => ({
          id: c.id, company: c.empresa, industry: c.industria, city: c.ciudad,
          employees: String(c.empleados ?? ''), message: c.mensaje_inicial, type: c.tipo_de_caso,
        })));
      })
      .catch(() => {}); // si falla, se quedan los casos de respaldo
    return () => { vivo = false; };
  }, []);

  function handleLoadDemo(demoCase) {
    startNewMeeting({
      company:     demoCase.company,
      industry:    demoCase.industry,
      city:        demoCase.city ?? '',
      employees:   demoCase.employees,
      notes:       demoCase.message,
      meetingDate: new Date().toISOString().slice(0, 10),
      step:        'meeting',
    });
    // Se creó una reunión NUEVA con los datos del caso: se abre en modo edición para revisarla
    router.push('/meeting?editar=1');
  }

  function handleContinueMeeting(mtg) {
    const stepRoutes = {
      meeting:   '/meeting?editar=1',
      copilot:   '/copilot',
      diagnosis: '/diagnosis',
      minutes:   '/minutes',
      proposal:  '/proposal',
    };
    router.push(stepRoutes[mtg.step] ?? '/meeting');
  }

  return (
    <div className={styles.page}>

      {/* ── Encabezado ── */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.title}>Dashboard</h2>
          <p className={styles.subtitle}>Alestra Sales Copilot · Prototipo académico</p>
        </div>
        <Button onClick={() => router.push('/meeting')}>
          + Nueva Reunión
        </Button>
      </div>

      {/* ── Banner demo ── */}
      <div className={styles.demoBanner}>
        <span className={styles.demoIcon}>⚠</span>
        <span>
          <strong>DATOS SIMULADOS</strong> — Catálogo y casos ficticios del Hackathon.
          Sin <code>.env.local</code> la app funciona en modo demostración (sin IA) y lo indica en cada resultado.
        </span>
      </div>

      {/* ── Estadísticas ── */}
      <section className={styles.statsGrid} aria-label="Estadísticas de sesión">
        <StatsCard
          label="Reunión activa"
          value={hasActiveMeeting ? '1' : '0'}
          sub={hasActiveMeeting ? meeting.company || 'Sin empresa' : 'Sin reunión en curso'}
          accent={hasActiveMeeting}
        />
        <StatsCard label="Productos en catálogo" value="45"   sub="7 familias tecnológicas" />
        <StatsCard label="Paquetes disponibles"  value="7"    sub="Con descuento del 8%" />
        <StatsCard label="Reglas de escalamiento" value="10"  sub="Condiciones comerciales: 11" />
      </section>

      {/* ── Reunión activa ── */}
      {hasActiveMeeting && (
        <section>
          <h3 className={styles.sectionTitle}>Reunión en curso</h3>
          <div className={styles.activeMeetingWrapper}>
            <MeetingCard
              meeting={meeting}
              onSelect={handleContinueMeeting}
            />
          </div>
        </section>
      )}

      {/* ── Reuniones anteriores (cada una con su propio registro) ── */}
      {isHydrated && meetingHistory.length > 0 && (
        <section>
          <h3 className={styles.sectionTitle}>Reuniones anteriores ({meetingHistory.length})</h3>
          <div className={styles.demoGrid}>
            {meetingHistory.map((m) => (
              <div key={m.id} className={styles.demoCase}>
                <div className={styles.demoCaseTop}>
                  <span className={styles.demoCaseCompany}>{m.company || 'Sin empresa'}</span>
                  <Badge variant={m.analysisSource === 'gemini' ? 'success' : 'default'}>{m.analysisSource === 'gemini' ? 'Gemini' : m.analysis ? 'Demo' : 'Sin análisis'}</Badge>
                </div>
                <p className={styles.demoCaseMsg}>
                  {m.meetingDate || 'Sin fecha'} · {m.industry || 'Sin industria'}{m.opportunityType ? ` · ${m.opportunityType}` : ''}
                </p>
                <div className={styles.demoCaseFoot}>
                  <button className={styles.demoLoadBtn} type="button" onClick={() => deleteFromHistory(m.id)} aria-label={`Eliminar reunión con ${m.company}`}>Eliminar</button>
                  <button className={styles.demoLoadBtn} type="button" onClick={() => { switchMeeting(m.id); handleContinueMeeting(m); }}>Reabrir →</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Accesos rápidos ── */}
      <section>
        <h3 className={styles.sectionTitle}>Accesos rápidos</h3>
        <div className={styles.quickGrid}>
          {QUICK_ACTIONS.map((a) => (
            <button
              key={a.href}
              className={styles.quickCard}
              onClick={() => router.push(a.href)}
              type="button"
            >
              <span className={styles.quickIcon}>{a.icon}</span>
              <span className={styles.quickLabel}>{a.label}</span>
              <span className={styles.quickDesc}>{a.desc}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Casos de demostración ── */}
      <section>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Casos de demostración</h3>
          <Badge variant="warning">Datos simulados · Hackathon Alestra</Badge>
        </div>
        <p className={styles.sectionNote}>
          Carga uno de estos casos ficticios para demostrar el flujo completo sin ingresar datos manualmente.
        </p>
        <div className={styles.demoGrid}>
          {casos.map((c) => (
            <div key={c.id} className={styles.demoCase}>
              <div className={styles.demoCaseTop}>
                <span className={styles.demoCaseCompany}>{c.company}</span>
                <Badge variant="default">{c.industry}</Badge>
              </div>
              <p className={styles.demoCaseMsg}>{c.message}</p>
              <div className={styles.demoCaseFoot}>
                <span className={styles.demoCaseEmployees}>{c.employees} empleados{c.city ? ` · ${c.city}` : ''}</span>
                <button
                  className={styles.demoLoadBtn}
                  onClick={() => handleLoadDemo(c)}
                  type="button"
                >
                  Cargar caso →
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
