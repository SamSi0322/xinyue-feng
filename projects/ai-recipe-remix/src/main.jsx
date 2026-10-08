import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Self-hosted variable fonts: Fraunces (display, with optical sizing) and Inter (UI/body).
import '@fontsource-variable/fraunces/opsz.css';
import '@fontsource-variable/inter';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
