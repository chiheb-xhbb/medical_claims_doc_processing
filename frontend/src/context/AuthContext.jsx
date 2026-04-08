import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { AUTH_CHANGED_EVENT } from '../services/api';
import { USER_ROLES } from '../constants/domainLabels';

const AUTH_TOKEN_KEY = 'token';
const AUTH_USER_KEY = 'auth_user';

const AuthContext = createContext(null);

const normalizeUser = (user) => {
  if (!user || typeof user !== 'object') {
    return null;
  }

  const normalizedRole = typeof user.role === 'string' ? user.role.toUpperCase() : null;
  const role = normalizedRole && USER_ROLES[normalizedRole] ? USER_ROLES[normalizedRole] : normalizedRole;

  return {
    ...user,
    role
  };
};

const getStoredUser = () => {
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
};

const storeUser = (nextUser) => {
  const normalized = normalizeUser(nextUser);

  if (!normalized) {
    localStorage.removeItem(AUTH_USER_KEY);
    return null;
  }

  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(normalized));
  return normalized;
};

const notifyAuthChanged = () => {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
};

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(AUTH_TOKEN_KEY));
  const [user, setUser] = useState(() => getStoredUser());
  const [isHydrating, setIsHydrating] = useState(true);

  const clearAuthState = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    setToken(null);
    setUser(null);
    notifyAuthChanged();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const hydrateSession = async () => {
      const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);

      if (!storedToken) {
        if (isMounted) {
          setToken(null);
          setUser(null);
          setIsHydrating(false);
        }
        return;
      }

      try {
        const response = await api.get('/me');
        const nextUser = storeUser(response.data?.user ?? response.data);

        if (!isMounted) {
          return;
        }

        setToken(storedToken);
        setUser(nextUser);
        notifyAuthChanged();
      } catch (error) {
        const status = error?.response?.status;

        if (status === 401) {
          localStorage.removeItem(AUTH_TOKEN_KEY);
          localStorage.removeItem(AUTH_USER_KEY);

          if (isMounted) {
            setToken(null);
            setUser(null);
          }

          notifyAuthChanged();
        }
      } finally {
        if (isMounted) {
          setIsHydrating(false);
        }
      }
    };

    hydrateSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const syncAuthState = () => {
      setToken(localStorage.getItem(AUTH_TOKEN_KEY));
      setUser(getStoredUser());
    };

    window.addEventListener(AUTH_CHANGED_EVENT, syncAuthState);
    window.addEventListener('storage', syncAuthState);

    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, syncAuthState);
      window.removeEventListener('storage', syncAuthState);
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const response = await api.post('/login', { email, password });
    const nextToken = response.data?.token || null;
    const nextUser = storeUser(response.data?.user);

    if (nextToken) {
      localStorage.setItem(AUTH_TOKEN_KEY, nextToken);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }

    setToken(nextToken);
    setUser(nextUser);
    notifyAuthChanged();

    return { token: nextToken, user: nextUser };
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/logout');
    } finally {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
      setToken(null);
      setUser(null);
      notifyAuthChanged();
    }
  }, []);

  const value = useMemo(() => ({
    token,
    user,
    role: user?.role || null,
    isAuthenticated: Boolean(token),
    isHydrating,
    login,
    logout,
    clearAuthState
  }), [clearAuthState, isHydrating, login, logout, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}