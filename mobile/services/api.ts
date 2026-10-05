import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL, TOKEN_KEY } from '@/constants/config';

/**
 * Centralized Axios instance for all API calls.
 * - Base URL is always from env config, never hardcoded in components.
 * - JWT injected via Authorization Bearer header (not cookies — mobile can't use httpOnly cookies).
 * - Middleware reads Bearer header → injects x-user-id, x-workspace-id, x-user-role.
 */
const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT from SecureStore
api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // SecureStore read failure — continue without token
  }
  return config;
});

// Response interceptor: surface error messages cleanly
api.interceptors.response.use(
  (response) => response,
  (error) => {
    let message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';

    if (error.message === 'Network Error') {
      message = `Cannot reach server at ${API_URL}. Ensure PC backend is running and phone is on the same Wi-Fi.`;
    }

    return Promise.reject(new Error(message));
  }
);

export default api;
