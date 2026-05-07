const BASE_URL = import.meta.env.VITE_API_URL;

if (!BASE_URL) {
  console.warn("⚠️ VITE_API_URL is not defined in your environment (.env file). API calls may fail.");
}

const apiClient = {
  get: (url) => request(url, { method: 'GET' }),
  post: (url, data) => request(url, { method: 'POST', body: JSON.stringify(data) }),
  put: (url, data) => request(url, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (url) => request(url, { method: 'DELETE' }),
  // For multipart/form-data uploads — do NOT set Content-Type, browser does it
  uploadForm: (url, formData) => request(url, { method: 'POST', body: formData, _multipart: true }),
};

async function request(url, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { ...options.headers };

  // Don't set Content-Type for multipart/form-data — browser handles it
  if (!options._multipart) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }


  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    // Handle token refresh logic
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
        } catch (err) {
          // Refresh failed - logout
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          window.location.href = '/customer';
        }
      }
    }
    throw data;
  }

  return data;
}

export default apiClient;
