import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';

import { App } from './App';
import { useLanguage } from './lib/i18n';
import { useAuth } from './store/auth';
import './index.css';

// Only customer pages are translated: staff (admin, store, driver, cashier) always see Arabic.
// Set before the first render and kept in sync with sign-in and sign-out.
const syncArabicOnly = () => {
  const role = useAuth.getState().session?.role;
  useLanguage.getState().setArabicOnly(role !== undefined && role !== 'customer');
};
syncArabicOnly();
useAuth.subscribe(syncArabicOnly);

/** Texts come from `t`, read while rendering: a language change remounts the pages (the route and the
 * query cache stay). */
function LocalizedApp() {
  const language = useLanguage((s) => s.language);
  return <App key={language} />;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <LocalizedApp />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
