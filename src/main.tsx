import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { registerSW } from 'virtual:pwa-register';

// Register PWA service worker
registerSW({
  onNeedRefresh() {
    if (confirm('New version available. Reload?')) {
      window.location.reload();
    }
  },
  onOfflineReady() {
    console.log('HanoBus is ready to work offline');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
