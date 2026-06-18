import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from './mocks/server.js';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AdminUserDetails from '../pages/Admin/AdminUserDetails.jsx';
import { ToastProvider } from '../context/ToastContext.jsx';

const BASE = 'http://localhost:3001/api';

const MOCK_USER_LEGACY = {
  _id: 'u123',
  name: 'John Legacy', // No firstName or lastName
  phone: '9876543210',
  email: 'john@legacy.com',
  createdAt: '2026-01-10T12:00:00Z',
  addresses: [
    {
      _id: 'addr1',
      label: 'Home',
      line1: 'Flat 101, A Building',
      city: 'Noida',
      pincode: '201301',
      isDefault: true
    }
  ]
};

const MOCK_SUBSCRIPTIONS = [
  {
    _id: 'sub1',
    package: null, // Trial/No package name
    status: 'Active',
    endDate: '2026-07-10T12:00:00Z',
    amount: 499,
    vehicle: null // Vehicle was deleted
  }
];

const MOCK_ORDERS = [
  {
    _id: 'order1',
    orderId: 'CZ2606-9999',
    status: 'Placed',
    createdAt: '2026-06-17T12:00:00Z',
    totalAmount: 1299,
    items: [
      {
        product: null, // Product deleted
        quantity: 2,
        priceAtPurchase: 599
      }
    ]
  }
];

function renderUserDetails(userId, userPayload, subsPayload, ordersPayload) {
  server.use(
    http.get(`${BASE}/admin/users/${userId}`, () =>
      HttpResponse.json({
        success: true,
        user: userPayload,
        subscriptions: subsPayload || [],
        vehicles: [],
        orders: ordersPayload || []
      })
    ),
    http.get(`${BASE}/admin/packages`, () => HttpResponse.json({ success: true, packages: [] })),
    http.get(`${BASE}/admin/societies`, () => HttpResponse.json({ success: true, societies: [] })),
    http.get(`${BASE}/admin/cleaners`, () => HttpResponse.json({ success: true, cleaners: [] })),
    http.get(`${BASE}/admin/brands`, () => HttpResponse.json({ success: true, brands: [] })),
    http.get(`${BASE}/admin/vehicle-categories`, () => HttpResponse.json({ success: true, categories: [] }))
  );

  return render(
    <MemoryRouter initialEntries={[`/admin/users/${userId}`]}>
      <ToastProvider>
        <Routes>
          <Route path="/admin/users/:id" element={<AdminUserDetails />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('AdminUserDetails — Safe Rendering (Bug 6 fix)', () => {
  it('renders successfully for a legacy user with only "name" and no "firstName"/"lastName"', async () => {
    renderUserDetails('u123', MOCK_USER_LEGACY, [], []);

    // Wait for the details to be rendered
    const nameEl = await screen.findByRole('heading', { name: /John Legacy/i });
    expect(nameEl).toBeInTheDocument();

    // Verify avatar initials falls back to "J"
    const initialsEl = screen.getByText('J');
    expect(initialsEl).toBeInTheDocument();

    // Verify phone number is shown
    expect(screen.getByText('9876543210')).toBeInTheDocument();
  });

  it('renders successfully when user has a subscription with a deleted vehicle and missing package', async () => {
    renderUserDetails('u123', MOCK_USER_LEGACY, MOCK_SUBSCRIPTIONS, []);

    // Wait for data load
    await screen.findByText('John Legacy');

    // Trial/No package should fallback to 'Trial Package'
    expect(screen.getByText('Trial Package')).toBeInTheDocument();

    // Deleted vehicle details should fallback to 'N/A' safely
    expect(screen.getByText(/Vehicle: N\/A/i)).toBeInTheDocument();
  });

  it('renders successfully when user has orders with deleted products and missing items list', async () => {
    renderUserDetails('u123', MOCK_USER_LEGACY, [], MOCK_ORDERS);

    // Wait for data load
    await screen.findByText('John Legacy');

    // Order items with null product should fallback to 'Unknown Product' safely
    expect(screen.getByText(/Items: Unknown Product \(x2\)/i)).toBeInTheDocument();
  });
});
