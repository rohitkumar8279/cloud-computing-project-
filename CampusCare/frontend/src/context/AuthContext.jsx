import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { Hub } from 'aws-amplify/utils';
import * as auth from '../services/authService';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async (opts) => {
    const u = await auth.getCurrentUser(opts);
    setUser(u);
    return u;
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));

    const stop = Hub.listen('auth', ({ payload }) => {
      if (payload.event === 'signedOut' || payload.event === 'tokenRefresh_failure') setUser(null);
      if (payload.event === 'signedIn') refreshUser();
    });
    const onUnauthorized = () => refreshUser();
    window.addEventListener('campuscare:unauthorized', onUnauthorized);
    return () => {
      stop();
      window.removeEventListener('campuscare:unauthorized', onUnauthorized);
    };
  }, [refreshUser]);

  /** Returns { done: true, user } or { done: false, step } for extra steps. */
  const login = useCallback(
    async (email, password) => {
      const res = await auth.login(email, password);
      if (res.isSignedIn) return { done: true, user: await refreshUser() };
      return { done: false, step: res.nextStep?.signInStep };
    },
    [refreshUser],
  );

  const completeNewPassword = useCallback(
    async (newPassword) => {
      const res = await auth.completeNewPassword(newPassword);
      if (res.isSignedIn) return { done: true, user: await refreshUser() };
      return { done: false, step: res.nextStep?.signInStep };
    },
    [refreshUser],
  );

  const logout = useCallback(async () => {
    await auth.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      completeNewPassword,
      refreshUser,
      register: auth.register,
      confirmRegistration: auth.confirmRegistration,
      resendCode: auth.resendCode,
      forgotPassword: auth.forgotPassword,
      confirmForgotPassword: auth.confirmForgotPassword,
    }),
    [user, loading, login, logout, completeNewPassword, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
