import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';
import { clearAllPersistentStorage } from './utils/clearAllPersistentStorage';

// Eksekusi pembersihan penyimpanan lokal & cache bawaan template lama saat pertama kali dimuat
if (typeof window !== 'undefined' && !localStorage.getItem('erp_persistent_storage_purged_v4_clean_1447')) {
  clearAllPersistentStorage();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

