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

import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import App from './App.jsx';
import { InstitutionProvider } from './lib/institutionContext.jsx';
import { API_BASE_URL } from './utils/api.js';

// Shared React Query client with sensible defaults for cached data access.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // cache cleanup window
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function InstitutionBootstrap() {
  const [state, setState] = useState({ status: 'loading', institution: null });

  useEffect(() => {
    const host = (typeof window !== 'undefined' && window.location && window.location.host) ? window.location.host : '';
    const isLocal = host.includes('localhost') || host.startsWith('127.0.0.1') || host.startsWith('13.219.64.187') || host === '::1' || host.endsWith('.local') || host === '';
    // Treat the official gateway and the Tamilnadu gateway as "safe" hosts
    // that should not perform a remote institution lookup.
    const isGatewayHost = host === 'web.inzighted.com' || host === 'tamilnadu.inzighted.com' || host.endsWith('.tamilnadu.inzighted.com');

    // Local and gateway safe fallback (no remote lookup for localhost/gateway)
    if (isLocal || isGatewayHost) {
      setState({
        status: 'ready',
        institution: { institutionId: 'dev', displayName: 'InzightEd' }
      });
      return;
    }

    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/institution-by-domain?domain=${encodeURIComponent(host)}` , {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: controller.signal,
        });

        if (res.status === 404) {
          setState({ status: 'invalid', institution: null });
          return;
        }

        if (!res.ok) {
          setState({ status: 'invalid', institution: null });
          return;
        }

        const data = await res.json();
        if (data && typeof data.institutionId === 'string' && typeof data.displayName === 'string') {
          setState({ status: 'ready', institution: { institutionId: data.institutionId, displayName: data.displayName } });
        } else {
          setState({ status: 'invalid', institution: null });
        }
      } catch (e) {
        setState({ status: 'invalid', institution: null });
      }
    })();

    return () => controller.abort();
  }, []);

  if (state.status === 'invalid') {
    // Full-screen minimal fallback on invalid domain
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', width: '100vw', fontSize: '1rem'
      }}>
        Invalid institution domain
      </div>
    );
  }

  if (state.status !== 'ready') {
    // Keep minimal during resolution to avoid rendering main app
    return null;
  }

  return (
    <InstitutionProvider value={state.institution}>
      <App />
    </InstitutionProvider>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <InstitutionBootstrap />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
