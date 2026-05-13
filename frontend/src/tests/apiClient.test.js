import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from './mocks/server.js';
import apiClient from '../services/apiClient.js';

const BASE = 'http://localhost:3001/api';

describe('apiClient — token refresh on 401', () => {
  it('retries the original request with a new token after a successful refresh', async () => {
    localStorage.setItem('token', 'expired_token');
    localStorage.setItem('refreshToken', 'valid_refresh_tok');

    // First call → 401, then after refresh → 200
    let callCount = 0;
    server.use(
      http.get(`${BASE}/customer/profile`, ({ request }) => {
        callCount++;
        const auth = request.headers.get('Authorization');
        if (auth === 'Bearer expired_token') return HttpResponse.json({ message: 'Token expired' }, { status: 401 });
        return HttpResponse.json({ success: true, user: { _id: 'u1' } });
      }),
      http.post(`${BASE}/auth/refresh-token`, () =>
        HttpResponse.json({ success: true, token: 'new_access_tok', refreshToken: 'new_refresh_tok' })
      )
    );

    const res = await apiClient.get('/customer/profile');
    expect(res.success).toBe(true);
    expect(callCount).toBe(2); // original + retry
  });

  it('stores the rotated refreshToken in localStorage (Bug 3 fix)', async () => {
    localStorage.setItem('token', 'expired_token');
    localStorage.setItem('refreshToken', 'valid_refresh_tok');

    server.use(
      http.get(`${BASE}/some-endpoint`, ({ request }) => {
        const auth = request.headers.get('Authorization');
        if (auth === 'Bearer expired_token') return HttpResponse.json({ message: 'expired' }, { status: 401 });
        return HttpResponse.json({ success: true });
      }),
      http.post(`${BASE}/auth/refresh-token`, () =>
        HttpResponse.json({ success: true, token: 'rotated_access', refreshToken: 'rotated_refresh' })
      )
    );

    await apiClient.get('/some-endpoint');

    expect(localStorage.getItem('token')).toBe('rotated_access');
    expect(localStorage.getItem('refreshToken')).toBe('rotated_refresh');
  });

  it('throws a sessionExpired error (not undefined) when refresh fails (Bug 8 fix)', async () => {
    localStorage.setItem('token', 'expired_token');
    localStorage.setItem('refreshToken', 'bad_refresh');

    server.use(
      http.get(`${BASE}/protected`, () => HttpResponse.json({ message: 'expired' }, { status: 401 })),
      http.post(`${BASE}/auth/refresh-token`, () => HttpResponse.json({ success: false }, { status: 401 }))
    );

    await expect(apiClient.get('/protected')).rejects.toMatchObject({
      sessionExpired: true,
    });
  });

  it('clears localStorage when session expires', async () => {
    localStorage.setItem('token', 'expired_token');
    localStorage.setItem('refreshToken', 'bad_refresh');
    localStorage.setItem('userRole', 'customer');

    server.use(
      http.get(`${BASE}/protected2`, () => HttpResponse.json({ message: 'expired' }, { status: 401 })),
      http.post(`${BASE}/auth/refresh-token`, () => HttpResponse.json({ success: false }, { status: 401 }))
    );

    try { await apiClient.get('/protected2'); } catch { /* expected */ }

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });
});

describe('apiClient — network and server errors', () => {
  it('throws a network error when fetch itself fails', async () => {
    server.use(http.get(`${BASE}/down`, () => HttpResponse.error()));
    await expect(apiClient.get('/down')).rejects.toMatchObject({ status: 0 });
  });

  it('throws with the server message on 4xx', async () => {
    server.use(http.get(`${BASE}/bad`, () => HttpResponse.json({ success: false, message: 'Bad request' }, { status: 400 })));
    await expect(apiClient.get('/bad')).rejects.toMatchObject({ message: 'Bad request', status: 400 });
  });

  it('does not retry on second 401 (prevents infinite loop)', async () => {
    localStorage.setItem('token', 'tok');
    localStorage.setItem('refreshToken', 'ref');

    let hits = 0;
    server.use(
      http.get(`${BASE}/loop`, () => { hits++; return HttpResponse.json({ message: 'expired' }, { status: 401 }); }),
      http.post(`${BASE}/auth/refresh-token`, () => HttpResponse.json({ success: true, token: 'new_tok', refreshToken: 'new_ref' }))
    );

    try { await apiClient.get('/loop'); } catch { /* expected */ }
    expect(hits).toBe(2); // original + one retry, then stops
  });
});

describe('apiClient — multipart upload', () => {
  it('does not set Content-Type header for form data (lets browser set boundary)', async () => {
    let receivedContentType;
    server.use(
      http.post(`${BASE}/upload`, ({ request }) => {
        receivedContentType = request.headers.get('Content-Type');
        return HttpResponse.json({ success: true });
      })
    );
    const fd = new FormData();
    fd.append('file', new Blob(['hello']), 'test.txt');
    await apiClient.uploadForm('/upload', fd);
    expect(receivedContentType).not.toContain('application/json');
  });
});
