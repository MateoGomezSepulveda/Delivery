import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import '@/index.css';
import { registerNotificationServiceWorker } from '@/utils/browserNotifications';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

if ('serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => {
    void registerNotificationServiceWorker();
  });
}
