import api, { AUTH_CHANGED_EVENT, AUTH_FEEDBACK_KEY } from './api';
import { setAuthToken } from '../utils/setAuthToken';

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';
export { AUTH_CHANGED_EVENT };

const normalizeUser = (user) => {
  if (!user || typeof user !== 'object') {
    return null;
  }

  const role = typeof user.role === 'string' ? user.role.toUpperCase() : null;

  return {
    ...user,
    role
  };
};

const notifyAuthChanged = () => {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
};

const storeUser = (user) => {
  const normalized = normalizeUser(user);

  if (!normalized) {
    localStorage.removeItem(AUTH_USER_KEY);
    return null;
  }

  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(normalized));
  return normalized;
};

export function getStoredUser() {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return normalizeUser(JSON.parse(raw));
  } catch {
    localStorage.removeItem(AUTH_USER_KEY);
    return null;
  }
}

export function getStoredRole() {
  return getStoredUser()?.role || null;
}

export function consumeAuthFeedback() {
  const message = sessionStorage.getItem(AUTH_FEEDBACK_KEY);

  if (!message) {
    return null;
  }

  sessionStorage.removeItem(AUTH_FEEDBACK_KEY);
  return message;
}

export function getDefaultLandingPath(role = getStoredRole()) {
  if (role === 'GESTIONNAIRE' || role === 'ADMIN') {
    return '/dossiers';
  }

  return '/documents';
}

/**
 * Login user with email and password
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<{token: string, user: object}>}
 */
export async function login(email, password) {
  const response = await api.post('/login', { email, password });
  const { token, user } = response.data;
  sessionStorage.removeItem(AUTH_FEEDBACK_KEY);
  
  // Store token in localStorage
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  
  // Set Authorization header for future requests
  setAuthToken(token);

  const normalizedUser = storeUser(user);
  notifyAuthChanged();
  
  return { token, user: normalizedUser };
}

/**
 * Logout current user
 */
export async function logout() {
  try {
    await api.post('/logout');
  } finally {
    // Always clear token, even if API call fails
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    sessionStorage.removeItem(AUTH_FEEDBACK_KEY);
    setAuthToken(null);
    notifyAuthChanged();
  }
}

/**
 * Get current authenticated user
 * @returns {Promise<object>} User object
 */
export async function getCurrentUser() {
  const response = await api.get('/me');
  const user = storeUser(response.data.user);
  notifyAuthChanged();
  return user;
}

/**
 * Check if user is authenticated (has token in localStorage)
 * @returns {boolean}
 */
export function isAuthenticated() {
  return !!localStorage.getItem(AUTH_TOKEN_KEY);
}
