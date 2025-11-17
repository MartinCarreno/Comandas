
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import React, { useState } from 'react';
import Auth from './Auth';


const qc = new QueryClient();
const router = createBrowserRouter([
  { path: '/auth', element: <App /> }
]);

const Root = () => {
  const [logged, setLogged] = useState(!!localStorage.getItem('token'));
  return logged ? <App /> : <Auth onLogged={()=>setLogged(true)} />;
};


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
      <Root />
    </QueryClientProvider>
  </React.StrictMode>
);