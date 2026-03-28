import axios from 'axios';

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';
const AUTH_CHANGED_EVENT = 'auth:changed';

export function getApiErrorMessage(error, fallbackMessage) {
  if (!error?.response) {
    return 'Network error. Please check your connection and retry.';
  }

  const status = error.response.status;
  const backendErrors = error.response?.data?.errors || {};
  const firstBackendError = Object.values(backendErrors)[0];

  if (firstBackendError) {
    return Array.isArray(firstBackendError) ? firstBackendError[0] : firstBackendError;
  }

  const backendMessage = error.response?.data?.message;

  if (status === 401) {
    return backendMessage || 'Your session has expired. Please log in again.';
  }

  if (status === 403) {
    return backendMessage || 'You are not allowed to perform this action.';
  }

  if (status === 404) {
    return backendMessage || 'The requested resource was not found.';
  }

  if (status === 422) {
    return backendMessage || 'This action violates a business rule.';
  }

  return backendMessage || fallbackMessage || 'An unexpected error occurred.';
}

// Create axios instance with base configuration
const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Response interceptor for handling 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Remove token from localStorage
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
      // Remove Authorization header
      delete api.defaults.headers.common['Authorization'];
      window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
      // Redirect to login page
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
