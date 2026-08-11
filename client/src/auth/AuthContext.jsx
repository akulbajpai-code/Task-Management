import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { requireSupabase } from '../lib/supabase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const hydrateUser = useCallback(async (authUser) => {
    if (!authUser) {
      setUser(null);
      return null;
    }
    const profile = await api.profile(authUser);
    setUser(profile);
    return profile;
  }, []);

  useEffect(() => {
    let active = true;
    let subscription;

    async function restoreSession() {
      try {
        const client = requireSupabase();
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        if (data.session?.user && active) await hydrateUser(data.session.user);
      } catch (error) {
        console.warn('Could not restore TaskFlow session:', error.message);
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }

      try {
        const client = requireSupabase();
        const { data } = client.auth.onAuthStateChange((_event, session) => {
          // Keep the auth callback fast; profile queries happen after it returns.
          window.setTimeout(() => {
            if (!active) return;
            if (session?.user) hydrateUser(session.user).catch(() => setUser(null));
            else setUser(null);
          }, 0);
        });
        subscription = data.subscription;
      } catch {
        // The configuration error is surfaced on the sign-in screen instead.
      }
    }

    restoreSession();
    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, [hydrateUser]);

  const login = useCallback(async (credentials) => {
    const response = await api.login(credentials);
    return hydrateUser(response.user);
  }, [hydrateUser]);

  const signup = useCallback(async (details) => {
    const response = await api.signup(details);
    if (response.needsEmailConfirmation) return { needsEmailConfirmation: true };
    const profile = await hydrateUser(response.user);
    return { user: profile, needsEmailConfirmation: false };
  }, [hydrateUser]);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const updateProfile = useCallback(async (details) => {
    const profile = await api.updateProfile(details);
    setUser(profile);
    return profile;
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
