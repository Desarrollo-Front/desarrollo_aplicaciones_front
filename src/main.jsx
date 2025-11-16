import * as Sentry from '@sentry/react';
import { replayIntegration } from '@sentry/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import './theme.css';
import { ThemeProvider } from './context/ThemeContext';

// Inicialización de Sentry (no ejecutar durante tests)
if (!import.meta.env.VITEST) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,

    // Graba sesiones de usuario (solo 10% normales, 100% si hay error)
    integrations: [replayIntegration()],
    replaysSessionSampleRate: 0.1, // graba el 10% de sesiones normales
    replaysOnErrorSampleRate: 1.0, // graba el 100% si ocurre un error

    // Otros ajustes
    sendDefaultPii: true, // envía info básica del usuario (si se configura)
    environment: import.meta.env.MODE, // distingue dev / prod
  });

  // Si tenés info del usuario logueado, podés setearla así:
  const user = JSON.parse(localStorage.getItem('user'));
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.nombre || user.email,
    });
  }

  // Captura global de errores fuera de React
  window.addEventListener('error', (event) => {
    console.error('Captured global error:', event.error);
    Sentry.captureException(event.error);
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('Captured unhandled rejection:', event.reason);
    Sentry.captureException(event.reason);
  });

  // Breadcrumb personalizado para navegación (opcional)
  window.addEventListener('click', (e) => {
    Sentry.addBreadcrumb({
      category: 'ui.click',
      message: `Click en ${e.target.tagName}`,
      level: 'info',
    });
  });

  // Exponer Sentry en entorno local (solo para pruebas manuales)
  if (import.meta.env.DEV) {
    window.Sentry = Sentry;
  }
}

// Render de la app con ErrorBoundary
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<p>Ups, algo salió mal 😅</p>}>
      <ThemeProvider> {/* 3. ENVUELVE TU APP */}
        <App />
      </ThemeProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>
);
