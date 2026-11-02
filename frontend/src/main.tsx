import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/context/AuthContext';
import { App } from '@/App';
import '@/index.css';

// Verification of self-hosted font loading
if (typeof document !== 'undefined' && 'fonts' in document) {
  document.fonts.ready.then(() => {
    const serifLoaded = document.fonts.check('16px "Instrument Serif"');
    const sansLoaded = document.fonts.check('16px "Geist"');
    const monoLoaded = document.fonts.check('16px "Geist Mono"');
    if (!serifLoaded || !sansLoaded || !monoLoaded) {
      console.warn('[NeuroLearn] Font loading status:', {
        'Instrument Serif': serifLoaded,
        'Geist': sansLoaded,
        'Geist Mono': monoLoaded,
      });
    } else {
      console.log('[NeuroLearn] All design system fonts loaded successfully.');
    }
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
