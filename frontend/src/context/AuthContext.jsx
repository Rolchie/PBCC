import { useEffect, useState } from 'react';
import { authApi } from '../services/api';
import { AuthContext } from './auth-context';

const TOKEN_KEY = 'pbcc_access_token';
const USER_KEY = 'pbcc_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // loading = still checking whether an existing session is valid.
  // Prevents flashing the login page before we know the real state.
  const [loading, setLoading] = useState(true);

  // On first load, if a token is already stored (from a previous
  // session), verify it against the backend instead of trusting it
  // blindly — the token may have expired since the last visit.
  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem(TOKEN_KEY);

    async function bootstrap() {
      if (!token) return;

      try {
        const response = await authApi.me();
        if (cancelled) return;
        const loggedInUser = response.data.user ?? response.data;
        setUser(loggedInUser);
        localStorage.setItem(USER_KEY, JSON.stringify(loggedInUser));
      } catch {
        // Token invalid/expired — the api.js interceptor already
        // cleared storage on a 401, but clear again here in case
        // the failure was for another reason (network, 500, etc.).
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        if (!cancelled) setUser(null);
      }
    }

    bootstrap().finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  async function login(email, password) {
    const response = await authApi.login(email, password);

    // Expecting the backend to return a Supabase session and user.
    // Adjust the field names below if your backend's actual response
    // shape differs (e.g. { session: { access_token } } vs a flatter
    // shape) — this is the one place that needs to match it exactly.
    const accessToken =
      response.data.session?.access_token ?? response.data.access_token;
    const loggedInUser = response.data.user;

    if (!accessToken || !loggedInUser) {
      throw new Error(
        'Login response is missing an access token or user — check that ' +
          'this matches what POST /api/auth/login actually returns.'
      );
    }

    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(loggedInUser));
    setUser(loggedInUser);

    return loggedInUser;
  }

  function logout() {
    // Client-side only for now — there is no POST /api/auth/logout
    // endpoint yet. If the backend later needs to revoke the Supabase
    // session server-side too, this is where that call would be added.
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }

  const value = {
    user,
    role: user?.role ?? null,
    isAuthenticated: !!user,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}