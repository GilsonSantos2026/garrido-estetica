import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { StoreProvider } from './store/StoreContext.jsx';
import { createBackend } from './data/backend.js';

// O backend (localStorage ou Supabase) é escolhido pela configuração; ver src/data/backend.js.
createBackend().then((backend) => {
  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <StoreProvider backend={backend}>
        <App />
      </StoreProvider>
    </React.StrictMode>,
  );
});
