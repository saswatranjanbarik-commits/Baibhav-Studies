import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import StoreSync from './components/StoreSync.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreSync>
      <App />
    </StoreSync>
  </StrictMode>,
);
