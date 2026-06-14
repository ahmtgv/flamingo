import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Design tokens load once at the root; components consume the semantic aliases.
import '@/shared/styles/tokens.css';

import { App } from './app/App';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
