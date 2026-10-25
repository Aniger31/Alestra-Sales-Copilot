/**
 * Nueva Reunión — página de registro de reunión comercial.
 * Carga el formulario con los datos existentes si hay una reunión activa.
 * 'use client' para acceder a MeetingContext.
 */
'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMeeting } from '../../context/MeetingContext';
import MeetingForm from '../../components/meeting/MeetingForm';
import styles from './meeting.module.css';

export default function MeetingPage() {
  return (
    <Suspense fallback={null}>
      <MeetingPageContent />
    </Suspense>
  );
}

function MeetingPageContent() {
  const { meeting, isHydrated } = useMeeting();
  const params = useSearchParams();

  // "Nueva Reunión" siempre abre un formulario en blanco y crea un registro nuevo.
  // Solo /meeting?editar=1 edita la reunión activa.
  const isEditing = isHydrated && meeting.id !== null && params.get('editar') === '1';

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.title}>
            {isEditing ? 'Editar Reunión' : 'Nueva Reunión'}
          </h2>
          <p className={styles.subtitle}>
            {isEditing
              ? `Editando reunión con ${meeting.company || 'cliente sin nombre'}`
              : 'Registra los datos del cliente antes de iniciar la captura de la conversación.'}
          </p>
        </div>
      </div>

      {/* Formulario — pasa initialData si existe reunión activa */}
      {/* key: reinicia el formulario al cambiar entre nueva y edición */}
      {isHydrated && <MeetingForm key={isEditing ? `edit-${meeting.id}` : 'nueva'} initialData={isEditing ? meeting : null} />}
    </div>
  );
}
