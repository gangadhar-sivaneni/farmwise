import React, { createContext, useCallback, useContext, useState, useEffect } from 'react';
import * as auth from '../services/authService';
import { navigate } from '../utils/navigation';

const AuthContext = createContext(null);

/**
 * Signed-in user. `children` is a render function receiving the user, so the data providers can be
 * keyed by user id: switching account or logging out remounts them and drops every bit of in-memory state.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    return auth.onAuthUserChanged((u) => {
      setUser(u);
    });
  }, []);

  const login = useCallback(async (email, password, rememberMe = true) => {
    const res = await auth.login(email, password, rememberMe);
    if (res.ok && res.user) setUser(res.user);
    return res;
  }, []);

  const loginWithGoogle = useCallback(async (isRegistration = false) => {
    const res = await auth.loginWithGoogle(isRegistration);
    if (res.ok && res.user) setUser(res.user);
    return res;
  }, []);

  const register = useCallback(async (details) => {
    const res = await auth.register(details);
    if (res.ok && res.user) {
      setUser(res.user);
    }
    return res;
  }, []);

  const resendVerificationEmail = useCallback(async () => {
    return await auth.resendVerificationEmail();
  }, []);

  const checkEmailVerified = useCallback(async () => {
    const isVerified = await auth.checkEmailVerified();
    if (auth.currentUser()) setUser({ ...auth.currentUser() });
    return isVerified;
  }, []);

  const sendPasswordReset = useCallback(async (email) => {
    return await auth.sendPasswordReset(email);
  }, []);

  const handleVerifyEmailCode = useCallback(async (oobCode) => {
    const res = await auth.handleVerifyEmailCode(oobCode);
    if (res.ok && auth.currentUser()) setUser({ ...auth.currentUser() });
    return res;
  }, []);

  const verifyResetCode = useCallback(async (oobCode) => {
    return await auth.verifyResetCode(oobCode);
  }, []);

  const completePasswordReset = useCallback(async (oobCode, newPassword) => {
    return await auth.completePasswordReset(oobCode, newPassword);
  }, []);

  const changePassword = useCallback(async (newPassword) => {
    return await auth.changePassword(newPassword);
  }, []);

  const logout = useCallback(() => {
    auth.logout();
    setUser(null);
    navigate('/login', { replace: true });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        loginWithGoogle,
        register,
        logout,
        resendVerificationEmail,
        checkEmailVerified,
        sendPasswordReset,
        handleVerifyEmailCode,
        verifyResetCode,
        completePasswordReset,
        changePassword,
      }}
    >
      {children(user)}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
