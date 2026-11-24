import axios from 'axios';

const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000';

if (!import.meta.env.VITE_API_URL) {
  console.warn(
    'VITE_API_URL is not set. Using http://localhost:5000.'
  );
}

// ========================================
// SESSION STORAGE KEYS
// ========================================

export const SESSION_KEYS = {
  access: 'pbcc_access_token',
  refresh: 'pbcc_refresh_token',
  expires: 'pbcc_token_expires_at',
  user: 'pbcc_user'
};

// ========================================
// AXIOS CLIENTS
// ========================================

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Separate client prevents refresh requests from
// triggering the authenticated response interceptor.
const refreshClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

let refreshPromise = null;

// ========================================
// SESSION MANAGEMENT
// ========================================

export function clearStoredSession() {
  localStorage.removeItem(SESSION_KEYS.access);
  localStorage.removeItem(SESSION_KEYS.refresh);
  localStorage.removeItem(SESSION_KEYS.expires);
  localStorage.removeItem(SESSION_KEYS.user);
}

export function storeSession(session, user) {
  if (!session?.access_token) {
    throw new Error('Session access token is missing.');
  }

  localStorage.setItem(
    SESSION_KEYS.access,
    session.access_token
  );

  if (session.refresh_token) {
    localStorage.setItem(
      SESSION_KEYS.refresh,
      session.refresh_token
    );
  }

  const expiresAt =
    Number(session.expires_at) ||
    (
      session.expires_in
        ? Math.floor(Date.now() / 1000) +
          Number(session.expires_in)
        : 0
    );

  if (expiresAt > 0) {
    localStorage.setItem(
      SESSION_KEYS.expires,
      String(expiresAt)
    );
  } else {
    localStorage.removeItem(SESSION_KEYS.expires);
  }

  if (user) {
    localStorage.setItem(
      SESSION_KEYS.user,
      JSON.stringify(user)
    );
  }
}

export function getStoredAccessToken() {
  return localStorage.getItem(SESSION_KEYS.access);
}

export function hasStoredRefreshToken() {
  return Boolean(
    localStorage.getItem(SESSION_KEYS.refresh)
  );
}

export function isAccessTokenExpiringSoon() {
  const expiresAt = Number(
    localStorage.getItem(SESSION_KEYS.expires)
  );

  if (!expiresAt) return false;

  const now = Math.floor(Date.now() / 1000);

  // Refresh up to two minutes before expiry.
  return expiresAt <= now + 120;
}

// ========================================
// ACCESS TOKEN REFRESH
// ========================================

export async function refreshAccessToken() {
  if (refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = localStorage.getItem(
    SESSION_KEYS.refresh
  );

  if (!refreshToken) {
    throw new Error(
      'Your session has expired. Please log in again.'
    );
  }

  refreshPromise = (async () => {
    try {
      const response = await refreshClient.post(
        '/api/auth/refresh',
        {
          refresh_token: refreshToken
        }
      );

      const session = response.data?.session;
      const user = response.data?.user;

      if (
        !session?.access_token ||
        !session?.refresh_token
      ) {
        throw new Error(
          'The server returned an incomplete session.'
        );
      }

      // Do not restore a session after the user has
      // logged out or another login has replaced it.
      const currentRefreshToken = localStorage.getItem(
        SESSION_KEYS.refresh
      );

      if (currentRefreshToken !== refreshToken) {
        throw new Error(
          'Your login session has changed.'
        );
      }

      storeSession(session, user);

      return session.access_token;
    } catch (error) {
      const status = error.response?.status;

      // An invalid refresh token cannot be reused.
      // Keep tokens on network/server failures so
      // a temporary outage does not force logout.
      if (
        status === 400 ||
        status === 401 ||
        status === 403
      ) {
        const currentRefreshToken = localStorage.getItem(
          SESSION_KEYS.refresh
        );

        if (currentRefreshToken === refreshToken) {
          clearStoredSession();

          window.dispatchEvent(
            new Event('pbcc-session-expired')
          );
        }
      }

      throw error;
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

export async function getValidAccessToken() {
  let token = getStoredAccessToken();

  if (!token && hasStoredRefreshToken()) {
    token = await refreshAccessToken();
  } else if (
    token &&
    hasStoredRefreshToken() &&
    isAccessTokenExpiringSoon()
  ) {
    token = await refreshAccessToken();
  }

  return token;
}

function isPublicAuthRequest(url = '') {
  return (
    url.includes('/api/auth/login') ||
    url.includes('/api/auth/refresh')
  );
}

// ========================================
// REQUEST INTERCEPTOR
// ========================================

api.interceptors.request.use(async (config) => {
  const url = String(config.url || '');

  if (!isPublicAuthRequest(url)) {
    const token = await getValidAccessToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

// ========================================
// RESPONSE INTERCEPTOR
// ========================================

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const url = String(originalRequest?.url || '');

    const canRetry =
      status === 401 &&
      originalRequest &&
      !originalRequest._pbccRetried &&
      !isPublicAuthRequest(url) &&
      !url.includes('/api/auth/change-initial-password') &&
      hasStoredRefreshToken();

    if (canRetry) {
      originalRequest._pbccRetried = true;

      try {
        const newToken = await refreshAccessToken();

        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${newToken}`
        };

        return await api(originalRequest);
      } catch (refreshError) {
        // Return the original request error below.
      }
    }

    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Something went wrong. Please try again.';

    return Promise.reject({
      status,
      code: error.response?.data?.code,
      message,
      raw: error
    });
  }
);

export default api;

// ========================================
// AUTHENTICATION API
// ========================================

export const authApi = {
  login: (email, password) =>
    api.post('/api/auth/login', {
      email,
      password
    }),

  refresh: () => refreshAccessToken(),

  me: () => api.get('/api/auth/me'),

  changeInitialPassword: (
    currentPassword,
    newPassword,
    confirmPassword
  ) =>
    api.post('/api/auth/change-initial-password', {
      currentPassword,
      newPassword,
      confirmPassword
    })
};

// ========================================
// STUDENT API
// ========================================

export const studentApi = {
  periods: () =>
    api.get('/api/student/periods'),

  subjects: () =>
    api.get('/api/student/subjects'),

  grades: () =>
    api.get('/api/student/grades')
};

// ========================================
// HEALTH CHECK API
// ========================================

export const healthApi = {
  test: () => api.get('/api/test')
};

// ========================================
// ADMINISTRATOR USER MANAGEMENT API
// ========================================

export const adminUsersApi = {
  list: () => api.get('/api/admin/users'),

  create: ({
    first_name,
    middle_name,
    last_name,
    email,
    role,
    year_level,
    student_type
  }) => {
    const payload = {
      first_name,
      middle_name,
      last_name,
      email,
      role
    };

    // Include academic information only when
    // creating a Student account.
    if (role === 'Student') {
      payload.year_level = Number(year_level);
      payload.student_type = student_type;
    }

    return api.post(
      '/api/admin/users',
      payload
    );
  },

  update: (userId, changes) =>
    api.patch(
      `/api/admin/users/${userId}`,
      changes
    )
};

// ========================================
// ADMINISTRATOR AUDIT LOG API
// ========================================

export const adminAuditApi = {
  list: ({
    page = 1,
    action = '',
    tableName = ''
  } = {}) =>
    api.get('/api/admin/audit-logs', {
      params: {
        page,

        ...(action
          ? { action }
          : {}),

        ...(tableName
          ? { table_name: tableName }
          : {})
      }
    })
};

// ========================================
// ADMINISTRATOR DASHBOARD API
// ========================================

export const adminDashboardApi = {
  stats: () =>
    api.get('/api/admin/dashboard/stats')
};