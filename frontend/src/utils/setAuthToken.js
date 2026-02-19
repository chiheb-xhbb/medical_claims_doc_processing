import api from '../services/api';

/**
 * Set or remove the Authorization header for API requests
 * @param {string|null} token - The auth token or null to remove
 */
export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}
