import './globals.css';
import { MeetingProvider } from '../context/MeetingContext';
import AppShell from '../components/layout/AppShell';

export const metadata = {
  title: 'Alestra Sales Copilot',
  description: 'Asistente comercial con IA para ejecutivos de ventas B2B — Hackathon Alestra',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <MeetingProvider>
          <AppShell>
            {children}
          </AppShell>
        </MeetingProvider>
      </body>
    </html>
  );
}
