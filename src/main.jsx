// src/main.jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import App from './App.jsx';
import './wipe.js';

// Styles — ordered: variables/reset, components, tables, modals
import './styles/index.css';
import './styles/components.css';
import './styles/tables.css';
import './styles/modals.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <AppProvider>
        <App />
      </AppProvider>
    </AuthProvider>
  </StrictMode>
);
