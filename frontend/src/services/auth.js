import api from './api';
import { setAuthToken } from '../utils/setAuthToken';

/**
 * Login user with email and password
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<{token: string, user: object}>}
 */
export async function login(email, password) {
  const response = await api.post('/login', { email, password });
  const { token, user } = response.data;
  
  // Store token in localStorage
  localStorage.setItem('auth_token', token);
  
  // Set Authorization header for future requests
  setAuthToken(token);
  
  return { token, user };
}

/**
 * Logout current user
 */
export async function logout() {
  try {
    await api.post('/logout');
  } finally {
    // Always clear token, even if API call fails
    localStorage.removeItem('auth_token');
    setAuthToken(null);
  }
}

/**
 * Get current authenticated user
 * @returns {Promise<object>} User object
 */
export async function getCurrentUser() {
  const response = await api.get('/me');
  return response.data.user;
}

/**
 * Check if user is authenticated (has token in localStorage)
 * @returns {boolean}
 */
export function isAuthenticated() {
  return !!localStorage.getItem('auth_token');
}
