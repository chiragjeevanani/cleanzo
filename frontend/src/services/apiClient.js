const BASE_URL = import.meta.env.VITE_API_URL;

if (!BASE_URL) {
  console.warn('⚠️ VITE_API_URL is not defined in your environment (.env file). API calls may fail.');
}

const apiClient = {
  get: (url, params) => {
    let finalUrl = url;
    if (params) {
      const query = new URLSearchParams(params).toString();
      finalUrl += `?${query}`;
    }
    return request(finalUrl, { method: 'GET' });
  },
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
    response = await fetch(`${BASE_URL}${url}`, { 
      ...options, 
      headers,
      credentials: 'include' // Important for cookies
    });
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
    if (response.status === 401 && !options._retry) {
      try {
        const refreshRes = await fetch(`${BASE_URL}/auth/refresh-token`, {
          method: 'POST',
          credentials: 'include'
        });
        const refreshData = await refreshRes.json();
        if (refreshData.success) {
          // Sync localStorage for UI/compatibility, though cookies are main source
          if (refreshData.token) localStorage.setItem('token', refreshData.token);
          if (refreshData.refreshToken) localStorage.setItem('refreshToken', refreshData.refreshToken);
          return request(url, { ...options, _retry: true });
        }
      } catch {
        // Refresh failed — clear session and redirect
      }
        const role = localStorage.getItem('userRole');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userRole');
        const isPublicPage = window.location.pathname === '/' || 
                            window.location.pathname === '/login' || 
                            window.location.pathname === '/admin/login';
        if (!isPublicPage) {
          window.dispatchEvent(new CustomEvent('auth:session-expired'));
        }
        setTimeout(() => {
          const path = window.location.pathname;
          const isProtectedPath = path.startsWith('/customer') || 
                                path.startsWith('/cleaner') || 
                                (path.startsWith('/admin') && path !== '/admin/login');
          
          if (isProtectedPath) {
            const target = path.startsWith('/admin') ? '/admin/login' : '/login';
            if (path !== target) {
              window.location.href = target;
            }
          }
        }, 1500);
        const sessionErr = new Error('Session expired — please log in again');
        sessionErr.status = 401;
        sessionErr.sessionExpired = true;
        throw sessionErr;
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
