import axios from 'axios';
import { env } from '@/utils/env';
import { useAuthStore } from '@/store/auth.store';

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  headers: {
    Accept: 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const path = String(error.config?.url ?? '');
      const authEndpoints = [
        '/auth/login',
        '/auth/register-member',
        '/auth/member-registration/verify-otp',
        '/auth/member-registration/resend-otp',
        '/auth/register-institution',
        '/auth/institution-registration/verify-otp',
        '/auth/institution-registration/resend-otp',
        '/auth/two-factor/verify',
        '/auth/forgot-password',
        '/auth/reset-password',
        '/auth/verify-reset-token',
      ];
      const isPublicAuthEndpoint = authEndpoints.some((suffix) => path.endsWith(suffix));

      // Keep transient auth challenge state (e.g. pending 2FA) on expected public-auth failures.
      if (!isPublicAuthEndpoint) {
        useAuthStore.getState().clearSession();
      }
    }

    return Promise.reject(error);
  },
);
