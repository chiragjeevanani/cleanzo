import { http, HttpResponse } from 'msw';

const BASE = 'http://localhost:3001/api';

export const handlers = [
  // Auth
  http.post(`${BASE}/auth/verify-otp`, () =>
    HttpResponse.json({ success: true, token: 'access_tok', refreshToken: 'refresh_tok', user: { _id: 'u1', role: 'customer', firstName: 'Jane', phone: '9000000001' } })
  ),
  http.post(`${BASE}/auth/login-password`, () =>
    HttpResponse.json({ success: true, token: 'access_tok', refreshToken: 'refresh_tok', user: { _id: 'u1', role: 'customer' } })
  ),
  http.post(`${BASE}/auth/refresh-token`, () =>
    HttpResponse.json({ success: true, token: 'new_access_tok', refreshToken: 'new_refresh_tok' })
  ),
  http.post(`${BASE}/auth/logout`, () =>
    HttpResponse.json({ success: true, message: 'Logged out successfully' })
  ),
  http.get(`${BASE}/auth/me`, ({ request }) => {
    const auth = request.headers.get('Authorization');
    if (!auth || auth === 'Bearer expired_token') {
      return HttpResponse.json({ success: false, message: 'Token expired' }, { status: 401 });
    }
    return HttpResponse.json({ success: true, user: { _id: 'u1', role: 'customer' } });
  }),

  // Public
  http.get(`${BASE}/public/settings`, () =>
    HttpResponse.json({ success: true, trialPrice: 30, prioritySlotFee: 99 })
  ),
];
