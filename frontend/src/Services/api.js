
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  console.error(
    'VITE_API_URL is not set. Check your frontend .env file.'
  );
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pbcc_access_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

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
      localStorage.removeItem('pbcc_access_token');
      localStorage.removeItem('pbcc_user');
    }

    return Promise.reject({
      status,
      message,
      raw: error,
    });
  }
);

export default api;

export const authApi = {
  login: (email, password) =>
    api.post('/api/auth/login', { email, password }),

  me: () => api.get('/api/auth/me'),
};

export const healthApi = {
  test: () => api.get('/api/test'),
};

export const adminUsersApi = {
  list: () => api.get('/api/admin/users'),

  create: ({ email, password, role, status }) =>
    api.post('/api/admin/users', {
      email,
      password,
      role,
      status,
    }),

  update: (userId, changes) =>
    api.patch(`/api/admin/users/${userId}`, changes),
};

export const adminAuditApi = {
  list: ({ page = 1, action = '', tableName = '' } = {}) =>
    api.get('/api/admin/audit-logs', {
      params: {
        page,
        ...(action ? { action } : {}),
        ...(tableName
          ? { table_name: tableName }
          : {}),
      },
    }),
};


export const adminDashboardApi = {
  stats: () => api.get('/api/admin/dashboard/stats'),
};

