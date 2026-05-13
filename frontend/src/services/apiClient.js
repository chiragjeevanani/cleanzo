const BASE_URL = import.meta.env.VITE_API_URL;

if (!BASE_URL) {
  console.warn('⚠️ VITE_API_URL is not defined in your environment (.env file). API calls may fail.');
}

const apiClient = {
  get: (url) => request(url, { method: 'GET' }),
  post: (url, data) => request(url, { method: 'POST', body: JSON.stringify(data) }),
  put: (url, data) => request(url, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (url) => request(url, { method: 'DELETE' }),
  uploadForm: (url, formData) => request(url, { method: 'POST', body: formData, _multipart: true }),
};

async function request(url, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { ...options.headers };

  if (!options._multipart) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${BASE_URL}${url}`, { ...options, headers });
  } catch (networkErr) {
    const err = new Error('Network error — check your connection');
    err.status = 0;
    throw err;
  }

  // Guard: server may return non-JSON (502, nginx error pages, etc.)
  let data;
  try {
    data = await response.json();
  } catch {
    const err = new Error(`Server error (${response.status})`);
    err.status = response.status;
    throw err;
  }

  if (!response.ok) {
    // Attempt token refresh on 401
    if (response.status === 401) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken && !options._retry) {
        try {
          const refreshRes = await fetch(`${BASE_URL}/auth/refresh-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });
          const refreshData = await refreshRes.json();
          if (refreshData.success) {
            localStorage.setItem('token', refreshData.token);
            return request(url, { ...options, _retry: true });
          }
        } catch {
          // Refresh failed — clear session and redirect
        }
        const role = localStorage.getItem('userRole');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userRole');
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
        setTimeout(() => {
          window.location.href = (role === 'admin' || role === 'superadmin') ? '/admin/login' : '/login';
        }, 1500);
        return;
      }
    }

    // Throw a proper Error instance with the server message
    const err = new Error(data?.message || `Request failed (${response.status})`);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export default apiClient;
