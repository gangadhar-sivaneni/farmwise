import React, { createContext, useCallback, useContext, useState } from 'react';
import * as auth from '../services/authService';
import { navigate } from '../utils/navigation';

const AuthContext = createContext(null);

/**
 * Signed-in user. `children` is a render function receiving the user, so the data providers can be
 * keyed by user id: switching account or logging out remounts them and drops every bit of in-memory state.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(auth.currentUser);

  const login = useCallback(async (email, password) => {
    const u = await auth.login(email, password);
    if (u) setUser(u);
    return !!u;
  }, []);

  const register = useCallback(async (details) => {
    const res = await auth.register(details);
    if (res.ok && res.user) {
      setUser(res.user);
    }
    return res;
  }, []);

  const logout = useCallback(() => {
    auth.logout();
    setUser(null);
    navigate('/login', { replace: true });
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children(user)}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
