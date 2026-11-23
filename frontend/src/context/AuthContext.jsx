import { useEffect, useState } from 'react';

import {
  authApi,
  clearStoredSession,
  getStoredAccessToken,
  getValidAccessToken,
  hasStoredRefreshToken,
  isAccessTokenExpiringSoon,
  refreshAccessToken,
  SESSION_KEYS,
  storeSession
} from '../Services/api';

import { AuthContext } from './auth-context';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const hasAccess = Boolean(
          getStoredAccessToken()
        );

        const hasRefresh = hasStoredRefreshToken();

        if (!hasAccess && !hasRefresh) {
          if (!cancelled) {
            setUser(null);
          }

          return;
        }

        // If the access token has expired, obtain
        // a new one before requesting /api/auth/me.
        await getValidAccessToken();

        const response = await authApi.me();

        if (cancelled) return;

        const loggedInUser =
          response.data.user ?? response.data;

        setUser(loggedInUser);

        localStorage.setItem(
          SESSION_KEYS.user,
          JSON.stringify(loggedInUser)
        );
      } catch (error) {
        if (cancelled) return;

        const status =
          error?.status ??
          error?.response?.status;

        // Invalid credentials require login again.
        // Temporary network errors do not justify
        // deleting a valid refresh token.
        if (
          status === 401 ||
          status === 403 ||
          !getStoredAccessToken() &&
            !hasStoredRefreshToken()
        ) {
          clearStoredSession();
          setUser(null);
        } else {
          // Do not treat a temporary server outage
          // as a successful authentication check.
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function maintainSession() {
      if (!active || !hasStoredRefreshToken()) {
        return;
      }

      if (!isAccessTokenExpiringSoon()) {
        return;
      }

      try {
        await refreshAccessToken();
      } catch (error) {
        console.warn(
          'PBCC session refresh was unsuccessful:',
          error?.message || 'Unknown error'
        );
      }
    }

    // Refresh periodically, including when the
    // browser tab has been left open for a long time.
    const interval = window.setInterval(
      maintainSession,
      30000
    );

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        maintainSession();
      }
    }

    function handleOnline() {
      maintainSession();
    }

    function handleSessionExpired() {
      setUser(null);
    }

    function handleStorage(event) {
      if (
        event.key === SESSION_KEYS.access ||
        event.key === SESSION_KEYS.refresh
      ) {
        if (
          !getStoredAccessToken() &&
          !hasStoredRefreshToken()
        ) {
          setUser(null);
        }
      }
    }

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange
    );

    window.addEventListener('online', handleOnline);

    window.addEventListener(
      'pbcc-session-expired',
      handleSessionExpired
    );

    window.addEventListener(
      'storage',
      handleStorage
    );

    return () => {
      active = false;
      window.clearInterval(interval);

      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange
      );

      window.removeEventListener(
        'online',
        handleOnline
      );

      window.removeEventListener(
        'pbcc-session-expired',
        handleSessionExpired
      );

      window.removeEventListener(
        'storage',
        handleStorage
      );
    };
  }, []);

  async function login(email, password) {
    const response = await authApi.login(
      email,
      password
    );

    const session = response.data.session;
    const loggedInUser = response.data.user;

    if (
      !session?.access_token ||
      !session?.refresh_token ||
      !loggedInUser
    ) {
      throw new Error(
        'Login response is missing session information or user.'
      );
    }

    storeSession(session, loggedInUser);

    setUser(loggedInUser);

    return loggedInUser;
  }

  function logout() {
    clearStoredSession();
    setUser(null);
  }

  async function changeInitialPassword(
    currentPassword,
    newPassword,
    confirmPassword
  ) {
    const response =
      await authApi.changeInitialPassword(
        currentPassword,
        newPassword,
        confirmPassword
      );

    // Require a fresh login with the new password.
    logout();

    return response.data;
  }

  const value = {
    user,
    role: user?.role ?? null,
    isAuthenticated: Boolean(user),
    mustChangePassword:
      user?.must_change_password === true,
    loading,
    login,
    logout,
    changeInitialPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}