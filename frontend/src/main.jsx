// Defensive runtime guard: some third-party code can call MutationObserver.observe
// with a non-Node value (causing "parameter 1 is not of type 'Node'"). Patch the
// prototype early so the call is ignored instead of throwing. This is a small,
// low-risk runtime safety net and should be removed once the root cause is fixed.
if (typeof window !== 'undefined' && window.MutationObserver && window.MutationObserver.prototype) {
  try {
    const _origObserve = window.MutationObserver.prototype.observe;
    window.MutationObserver.prototype.observe = function (target, options) {
      // Defensive check: only call original observe when target looks like a Node
      try {
        if (!(target instanceof Node)) {
          // Log once for diagnostics
          if (typeof console !== 'undefined' && console.warn) {
            console.warn('Ignored MutationObserver.observe call with non-Node target:', target);
          }
          return;
        }
      } catch (e) {
        // In edge environments where 'Node' may not be defined, use a duck-typing fallback
        if (!target || typeof target.nodeType !== 'number') {
          if (typeof console !== 'undefined' && console.warn) {
            console.warn('Ignored MutationObserver.observe call with invalid target:', target);
          }
          return;
        }
      }
      return _origObserve.call(this, target, options);
    };
  } catch (e) {
    // If monkey-patching fails, do not block app startup
  }
}

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
