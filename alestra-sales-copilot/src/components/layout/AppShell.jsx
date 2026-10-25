/**
 * AppShell — shell de la aplicación.
 * Combina Sidebar + Header + área de contenido.
 * Marcado como 'use client' porque gestiona el estado del menú móvil.
 * El RootLayout (server component) lo envuelve con MeetingProvider.
 */
'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import styles from './AppShell.module.css';

export default function AppShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={styles.shell}>
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className={styles.main}>
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </div>
  );
}
