import { useEffect, useState } from 'react';
import { authApi } from '../Services/api';
import { AuthContext } from './auth-context';

const TOKEN_KEY = 'pbcc_access_token';
const USER_KEY = 'pbcc_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem(TOKEN_KEY);

    async function bootstrap() {
      if (!token) return;

      try {
        const response = await authApi.me();

        if (cancelled) return;

        const loggedInUser =
          response.data.user ?? response.data;

        setUser(loggedInUser);
        localStorage.setItem(
          USER_KEY,
          JSON.stringify(loggedInUser)
        );
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);

        if (!cancelled) {
          setUser(null);
        }
      }
    }

    bootstrap().finally(() => {
      if (!cancelled) {
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  async function login(email, password) {
    const response = await authApi.login(email, password);

    const accessToken =
      response.data.session?.access_token ??
      response.data.access_token;

    const loggedInUser = response.data.user;

    if (!accessToken || !loggedInUser) {
      throw new Error(
        'Login response is missing an access token or user.'
      );
    }

    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(
      USER_KEY,
      JSON.stringify(loggedInUser)
    );

    setUser(loggedInUser);

    return loggedInUser;
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }

  async function changeInitialPassword(
    currentPassword,
    newPassword,
    confirmPassword
  ) {
    const response = await authApi.changeInitialPassword(
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
    isAuthenticated: !!user,
    mustChangePassword:
      user?.must_change_password === true,
    loading,
    login,
    logout,
    changeInitialPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}