import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import * as Sentry from '@sentry/react';
import { browserTracingIntegration } from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [browserTracingIntegration()],
  tracesSampleRate: 1.0, // captura 100% de transacciones, bajalo en prod si querés
  sendDefaultPii: true, // opcional: incluye datos del usuario si los configurás
});
// 🪛 Captura de errores globales fuera del flujo de React
window.addEventListener('error', (event) => {
  Sentry.captureException(event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  Sentry.captureException(event.reason);
});

if (import.meta.env.DEV) {
  window.Sentry = Sentry;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<p>Ocurrió un error inesperado 😅</p>}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>
);
