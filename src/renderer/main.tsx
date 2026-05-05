import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { api } from './lib/api-client';
import './assets/index.css';

// Inject API for browser environment (Electron provides window.api via preload)
if (typeof window !== 'undefined' && !(window as any).api) {
  (window as any).api = api;
}

const container = document.getElementById('root');
if (!container) throw new Error('Root element not found');

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
