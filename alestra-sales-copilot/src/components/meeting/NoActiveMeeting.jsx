/**
 * NoActiveMeeting — estado vacío cuando se entra a un paso sin reunión o sin datos previos.
 */
'use client';

import { useRouter } from 'next/navigation';
import Card from '../ui/Card';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';

export default function NoActiveMeeting({ cargando, titulo = 'No hay una reunión activa', texto = 'Registra una reunión o carga un caso de ejemplo desde el Dashboard.', destino = '/meeting', boton = 'Registrar reunión' }) {
  const router = useRouter();
  if (cargando) return <LoadingSpinner size="lg" label="Cargando reunión…" />;
  return (
    <Card padding="lg">
      <h2 style={{ color: 'var(--color-primary)', fontSize: 'var(--font-size-xl)', marginBottom: 'var(--spacing-2)' }}>{titulo}</h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-4)' }}>{texto}</p>
      <Button onClick={() => router.push(destino)}>{boton}</Button>
    </Card>
  );
}
