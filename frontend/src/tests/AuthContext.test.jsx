import { describe, it, expect, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from './mocks/server.js';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext.jsx';
import { ToastContext } from '../context/ToastContext.jsx';

// Minimal ToastContext provider so AuthProvider doesn't throw
const MockToastProvider = ({ children }) => (
  <ToastContext.Provider value={{ showToast: vi.fn() }}>
    {children}
  </ToastContext.Provider>
);

function renderWithAuth(ui) {
  return render(
    <MemoryRouter>
      <MockToastProvider>
        <AuthProvider>{ui}</AuthProvider>
      </MockToastProvider>
    </MemoryRouter>
  );
}

// A component that exposes auth state for assertions
function AuthReadout() {
  const { user, loading, login, loginWithPassword, logout } = useAuth();
  return (
    <div>
      <span data-testid="user">{user ? JSON.stringify(user) : 'null'}</span>
      <span data-testid="loading">{loading ? 'true' : 'false'}</span>
      <button onClick={() => login('9000000001', '123456', 'customer')}>Login OTP</button>
      <button onClick={() => loginWithPassword('9000000001', 'Pass123', 'customer')}>Login PW</button>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
}

describe('AuthContext — initialization', () => {
  it('sets user from /auth/me when token is present in localStorage', async () => {
    localStorage.setItem('token', 'valid_access_tok');
    server.use(
      http.get('http://localhost:3001/api/auth/me', () =>
        HttpResponse.json({ success: true, user: { _id: 'u1', role: 'customer', firstName: 'Jane' } })
      )
    );

    renderWithAuth(<AuthReadout />);
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('user').textContent).toContain('u1');
  });

  it('clears storage and leaves user null when /auth/me fails', async () => {
    localStorage.setItem('token', 'bad_token');
    server.use(
      http.get('http://localhost:3001/api/auth/me', () =>
        HttpResponse.json({ message: 'Invalid' }, { status: 401 })
      )
    );

    renderWithAuth(<AuthReadout />);
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(localStorage.getItem('token')).toBeNull();
  });
});

describe('AuthContext — login (OTP)', () => {
  it('stores token, refreshToken, userRole in localStorage and sets user', async () => {
    renderWithAuth(<AuthReadout />);
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    await userEvent.click(screen.getByText('Login OTP'));

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('access_tok');
      expect(localStorage.getItem('refreshToken')).toBe('refresh_tok');
      expect(localStorage.getItem('userRole')).toBe('customer');
      expect(screen.getByTestId('user').textContent).toContain('u1');
    });
  });
});

describe('AuthContext — loginWithPassword', () => {
  it('stores tokens and sets user state', async () => {
    renderWithAuth(<AuthReadout />);
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    await userEvent.click(screen.getByText('Login PW'));

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('access_tok');
      expect(localStorage.getItem('refreshToken')).toBe('refresh_tok');
      expect(screen.getByTestId('user').textContent).toContain('u1');
    });
  });
});

describe('AuthContext — logout (Bug 2 fix)', () => {
  it('calls POST /auth/logout with the stored refreshToken before clearing storage', async () => {
    localStorage.setItem('token', 'access_tok');
    localStorage.setItem('refreshToken', 'refresh_tok');
    localStorage.setItem('userRole', 'customer');

    let logoutBody = null;
    server.use(
      http.get('http://localhost:3001/api/auth/me', () =>
        HttpResponse.json({ success: true, user: { _id: 'u1', role: 'customer' } })
      ),
      http.post('http://localhost:3001/api/auth/logout', async ({ request }) => {
        logoutBody = await request.json();
        return HttpResponse.json({ success: true });
      })
    );

    renderWithAuth(<AuthReadout />);
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    await userEvent.click(screen.getByText('Logout'));

    await waitFor(() => {
      expect(logoutBody).not.toBeNull();
      expect(logoutBody.refreshToken).toBe('refresh_tok');
    });
  });

  it('clears localStorage even if the server logout call fails', async () => {
    localStorage.setItem('token', 'access_tok');
    localStorage.setItem('refreshToken', 'refresh_tok');
    localStorage.setItem('userRole', 'customer');

    server.use(
      http.get('http://localhost:3001/api/auth/me', () =>
        HttpResponse.json({ success: true, user: { _id: 'u1', role: 'customer' } })
      ),
      http.post('http://localhost:3001/api/auth/logout', () =>
        HttpResponse.json({ message: 'Server error' }, { status: 500 })
      )
    );

    renderWithAuth(<AuthReadout />);
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    await userEvent.click(screen.getByText('Logout'));

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });
  });
});

describe('AuthContext — session-expired event', () => {
  it('shows toast when auth:session-expired event fires', async () => {
    const showToast = vi.fn();
    render(
      <MemoryRouter>
        <ToastContext.Provider value={{ showToast }}>
          <AuthProvider><div /></AuthProvider>
        </ToastContext.Provider>
      </MemoryRouter>
    );

    act(() => window.dispatchEvent(new CustomEvent('auth:session-expired')));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/session expired/i), 'error'));
  });
});
