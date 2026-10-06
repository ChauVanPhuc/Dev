import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/shared/styles/style.css';
import '@/shared/styles/components.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
