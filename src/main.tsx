/**
 * ═══════════════════════════════════════════════════════════════════════════
 *                              SynCinema
 *                    Multi-Output Synchronized Player
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 *  @author     Ruslan Aliyev
 *  @version    2.0.1
 *  @license    Proprietary - All Rights Reserved
 *  @created    2025
 * 
 *  Description: Professional multi-audio synchronized video player with
 *               support for multiple audio outputs, EQ, compressor,
 *               subtitle sync, and detached player mode.
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { I18nProvider } from './context/I18nContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>
);