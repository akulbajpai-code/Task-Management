import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      if (!api.getToken()) {
        if (isMounted) setLoading(false);
        return;
      }
      try {
        const response = await api.me();
        if (isMounted) setUser(response.user);
      } catch {
        api.clearToken();
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    restoreSession();
    return () => { isMounted = false; };
  }, []);

  const login = useCallback(async (credentials) => {
    const response = await api.login(credentials);
    api.setToken(response.token);
    setUser(response.user);
    return response.user;
  }, []);

  const signup = useCallback(async (details) => {
    const response = await api.signup(details);
    api.setToken(response.token);
    setUser(response.user);
    return response.user;
  }, []);

  const logout = useCallback(() => {
    api.clearToken();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (details) => {
    const response = await api.updateProfile(details);
    setUser(response.user);
    return response.user;
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    login,
    signup,
    logout,
    updateProfile,
  }), [user, loading, login, signup, logout, updateProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
