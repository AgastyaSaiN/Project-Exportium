
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Register Service Worker for PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('App is ready for desktop installation. Scope:', registration.scope);
      })
      .catch(error => {
        console.warn('Service worker registration failed:', error);
      });
      
    // Refresh page if the service worker changes (ensures user is on latest version)
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
