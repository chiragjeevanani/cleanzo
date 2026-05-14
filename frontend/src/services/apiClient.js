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

const inflightRequests = new Map();

async function request(url, options = {}) {
  // Deduplicate simultaneous GET requests to prevent redundant logs (esp. in StrictMode)
  const isGet = !options.method || options.method === 'GET';
  const cacheKey = `${isGet ? 'GET' : options.method}:${url}`;
  
  if (isGet && inflightRequests.has(cacheKey)) {
    return inflightRequests.get(cacheKey);
  }

  const promise = (async () => {
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
        credentials: 'include'
      });
    } catch (networkErr) {
      const err = new Error('Network error — check your connection');
      err.status = 0;
      throw err;
    }

    let data;
    try {
      data = await response.json();
    } catch {
      const err = new Error(`Server error (${response.status})`);
      err.status = response.status;
      throw err;
    }

    if (!response.ok) {
      if (response.status === 401 && !options._retry) {
        try {
          const refreshRes = await fetch(`${BASE_URL}/auth/refresh-token`, {
            method: 'POST',
            credentials: 'include'
          });
          const refreshData = await refreshRes.json();
          if (refreshData.success) {
            if (refreshData.token) localStorage.setItem('token', refreshData.token);
            if (refreshData.refreshToken) localStorage.setItem('refreshToken', refreshData.refreshToken);
            return request(url, { ...options, _retry: true });
          }
        } catch { }
        
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userRole');
        const path = window.location.pathname;
        const isPublicPage = path === '/' || path === '/login' || path === '/admin/login';
        if (!isPublicPage) {
          window.dispatchEvent(new CustomEvent('auth:session-expired'));
          setTimeout(() => {
            const target = path.startsWith('/admin') ? '/admin/login' : '/login';
            window.location.href = target;
          }, 1500);
        }
        const sessionErr = new Error('Session expired');
        sessionErr.status = 401;
        throw sessionErr;
      }

      const err = new Error(data?.message || `Request failed (${response.status})`);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  })();

  if (isGet) {
    inflightRequests.set(cacheKey, promise);
    try {
      return await promise;
    } finally {
      inflightRequests.delete(cacheKey);
    }
  }

  return promise;
}

export default apiClient;
