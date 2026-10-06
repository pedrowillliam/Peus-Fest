import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App';
import { GuestProvider } from './lib/guest';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <GuestProvider>
        <App />
      </GuestProvider>
    </BrowserRouter>
  </StrictMode>,
);
