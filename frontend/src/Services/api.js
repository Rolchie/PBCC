import axios from 'axios';

// Base URL comes from the environment, never hardcoded, so the same
// build can point at localhost in dev and the Vercel backend in prod.
const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  // Fails loudly in dev rather than silently hitting the wrong host.
  console.error(
    'VITE_API_URL is not set. Copy .env.example to .env and set it.'
  );
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach the Supabase access token (issued by our backend's
// /api/auth/login) to every request, if we have one stored.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pbcc_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Centralized error handling: normalize backend errors into a single
// shape components can rely on, and detect expired/invalid sessions.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Something went wrong. Please try again.';

    if (status === 401) {
      // Session expired or invalid — clear it so the app doesn't keep
      // sending a dead token. AuthContext (added in Step 3) will react
      // to this by redirecting to the login page.
      localStorage.removeItem('pbcc_access_token');
      localStorage.removeItem('pbcc_user');
    }

    return Promise.reject({ status, message, raw: error });
  }
);

export default api;

// --- Endpoint wrappers -----------------------------------------------
// Only wraps endpoints that actually exist on the backend today.
// Do NOT add wrappers here for endpoints that haven't been built yet —
// add them when the real route exists, so this file never gets ahead
// of the backend contract.

export const authApi = {
  login: (email, password) =>
    api.post('/api/auth/login', { email, password }),
  me: () => api.get('/api/auth/me'),
};

export const healthApi = {
  test: () => api.get('/api/test'),
};