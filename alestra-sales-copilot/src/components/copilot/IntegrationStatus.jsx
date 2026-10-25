/**
 * IntegrationStatus — muestra lo que el SERVIDOR ve configurado (GET /api/status) y permite
 * probar las claves con una llamada mínima (GET /api/status?probar=1). Nunca muestra las claves.
 */
'use client';

import { useEffect, useState } from 'react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import styles from './Copilot.module.css';

function Fila({ nombre, info, envVar }) {
  const p = info?.prueba;
  let variant = info?.configurada ? 'info' : 'error';
  let texto = info?.configurada ? 'Clave cargada · sin probar' : `Falta ${envVar}`;
  if (p) {
    variant = p.ok ? 'success' : 'error';
    texto = p.ok ? `Conectado${p.ms ? ` · ${p.ms} ms` : ''}` : p.code;
  }
  return (
    <div className={styles.statusRow}>
      <div>
        <strong>{nombre}</strong>
        <span className={styles.statusSub}>
          {info?.modelo}
          {info?.formatoValido === false && ' · la clave no tiene el formato habitual, revísala'}
        </span>
        {p && !p.ok && <span className={styles.statusErr}>{p.mensaje}</span>}
      </div>
      <Badge variant={variant}>{texto}</Badge>
    </div>
  );
}

export default function IntegrationStatus() {
  const [estado, setEstado] = useState(null);
  const [probando, setProbando] = useState(false);
  const [error, setError] = useState('');

  async function cargar(probar = false) {
    setError('');
    if (probar) setProbando(true);
    try {
      const r = await fetch(`/api/status${probar ? '?probar=1' : ''}`, { cache: 'no-store' });
      setEstado(await r.json());
    } catch {
      setError('No se pudo consultar el estado del servidor.');
    } finally {
      setProbando(false);
    }
  }
  useEffect(() => { cargar(false); }, []);

  if (!estado) return <p className={styles.statusSub}>{error || 'Consultando integraciones…'}</p>;
  const env = estado.envFile;
  return (
    <div className={styles.status}>
      <Fila nombre="Groq Whisper" info={estado.groq} envVar="GROQ_API_KEY" />
      <Fila nombre="Gemini" info={estado.gemini} envVar="GEMINI_API_KEY" />
      {!env.existeEnvLocal && (
        <p className={styles.statusErr}>
          No hay <code>.env.local</code> en <code>{env.carpeta}</code>.
          {env.existeEnvLocalTxt ? ' Se encontró ".env.local.txt": renómbralo a ".env.local".' : ' Créalo junto a package.json.'}
          {' '}Después reinicia <code>npm run dev</code>.
        </p>
      )}
      {env.existeEnvLocal && (!estado.groq.configurada || !estado.gemini.configurada) && (
        <p className={styles.statusErr}>Existe <code>.env.local</code> pero falta alguna clave: revisa el nombre exacto de la variable y reinicia <code>npm run dev</code>.</p>
      )}
      <Button size="sm" variant="secondary" onClick={() => cargar(true)} loading={probando} disabled={probando}>
        Probar conexión
      </Button>
    </div>
  );
}
