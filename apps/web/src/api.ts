import axios from 'axios';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './authStorage';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10_000,
});

// Interceptor de REQUEST: agrega Authorization: Bearer <access_token> si existe.
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor de RESPONSE: intenta refresh en 401 si hay refresh token guardado.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const originalRequest = error.config as any;

    // Si no es 401 o ya reintentamos una vez, dejamos pasar el error.
    if (status !== 401 || originalRequest?._retry) {
      return Promise.reject(error);
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearTokens();
      return Promise.reject(error);
    }

    // Evita bucles infinitos en este request.
    originalRequest._retry = true;

    try {
      // Usamos axios "crudo" para /auth/refresh para que este request
      // no pase por los mismos interceptores.
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/refresh`,
        { refresh_token: refreshToken },
      );

      // Backend devuelve { access_token, refresh_token }
      setTokens(data.access_token, data.refresh_token);

      // Reintentamos el request original con el nuevo access token
      const newAccessToken = getAccessToken();
      if (newAccessToken) {
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      }

      return api(originalRequest);
    } catch (e) {
      // Si el refresh falla, limpiamos tokens y dejamos que la UI maneje el error.
      clearTokens();
      return Promise.reject(e);
    }
  },
);
