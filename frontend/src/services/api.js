import axios from 'axios';

const AUTH_TOKEN_KEY = 'token';
const AUTH_USER_KEY = 'auth_user';
export const AUTH_CHANGED_EVENT = 'auth:changed';
export const AUTH_FEEDBACK_KEY = 'auth_feedback_message';
export const DEACTIVATED_ACCOUNT_MESSAGE = 'Your account has been deactivated. Please contact an administrator.';

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

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  config.headers = config.headers || {};

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (config.headers.Authorization) {
    delete config.headers.Authorization;
  }

  return config;
});

const clearClientAuthSession = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  delete api.defaults.headers.common['Authorization'];
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
};

const redirectToLoginWithFeedback = (message = null) => {
  if (message) {
    sessionStorage.setItem(AUTH_FEEDBACK_KEY, message);
  }

  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

// Response interceptor for handling 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const backendMessage = error.response?.data?.message;
    const hasSession = Boolean(localStorage.getItem(AUTH_TOKEN_KEY));

    if (status === 401 && hasSession) {
      clearClientAuthSession();
      redirectToLoginWithFeedback('Your session has expired. Please log in again.');
    }

    if (status === 403 && hasSession && backendMessage === DEACTIVATED_ACCOUNT_MESSAGE) {
      clearClientAuthSession();
      redirectToLoginWithFeedback(DEACTIVATED_ACCOUNT_MESSAGE);
    }

    return Promise.reject(error);
  }
);

export default api;
