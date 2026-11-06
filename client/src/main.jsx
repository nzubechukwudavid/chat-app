import React from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { ToastProvider } from './components/ui/Toast';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);

// Register Service Worker for PWA (Install as Chrome app on Android/iOS/Desktop)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  // When an updated worker takes control, reload once so the page runs the
  // fresh HTML/JS pair instead of the previous shell. The first claim (no
  // existing controller) does not need a reload because the page is already
  // running the current build.
  let hadController = Boolean(navigator.serviceWorker.controller);
  let refreshing = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) {
      hadController = true;
      return;
    }
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js?v=5')
      .then((reg) => {
        console.log('[PWA] Service Worker active:', reg.scope);
      })
      .catch((err) => {
        console.warn('[PWA] Service Worker registration failed:', err);
      });
  });
}

 