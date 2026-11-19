import axios from 'axios';
import { appConfig } from './config';
import { getIdToken } from './authService';

// Authenticated client for the CampusCare HTTP API.
export const api = axios.create({
  baseURL: appConfig.apiBaseUrl,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await getIdToken();
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.message ||
      (status === 401
        ? 'Your session has expired. Please sign in again.'
        : status === 429
          ? 'Too many requests. Please slow down.'
          : error.code === 'ECONNABORTED'
            ? 'The request timed out.'
            : error.message === 'Network Error'
              ? 'Network error - check your connection or the API CORS settings.'
              : error.message || 'Request failed');
    if (status === 401) window.dispatchEvent(new Event('campuscare:unauthorized'));
    const err = new Error(message);
    err.status = status;
    err.details = error.response?.data?.details;
    return Promise.reject(err);
  },
);
