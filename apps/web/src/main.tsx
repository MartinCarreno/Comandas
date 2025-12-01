import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Auth from './Auth';
import App from './App';
import './index.css';
import { getAccessToken } from './authStorage';

const qc = new QueryClient();

const Root = () => {
  const [logged, setLogged] = useState(!!getAccessToken());

  const handleLogged = () => {
    setLogged(true);
  };

  const handleLogout = () => {
    setLogged(false);
    // opcional: qc.clear();
  };

  return logged ? <App onLogout={handleLogout} /> : <Auth onLogged={handleLogged} />;
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <Root />
    </QueryClientProvider>
  </React.StrictMode>,
);
