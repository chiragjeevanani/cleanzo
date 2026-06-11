import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from './mocks/server.js';
import { MemoryRouter } from 'react-router-dom';
import AdminUsers from '../pages/Admin/AdminUsers.jsx';

const BASE = 'http://localhost:3001/api';

const USERS = [
  { _id: 'a1', firstName: 'Asha', lastName: 'Rao', phone: '9000000001', vehiclesCount: 1, activePlan: 'Basic', isActive: true, createdAt: '2026-01-01' },
  { _id: 'a2', firstName: 'Bilal', lastName: 'Khan', phone: '9000000002', vehiclesCount: 0, activePlan: null, isActive: false, createdAt: '2026-01-02' },
];

function renderUsers() {
  server.use(http.get(`${BASE}/admin/users`, () => HttpResponse.json({ success: true, users: USERS })));
  return render(
    <MemoryRouter>
      <AdminUsers />
    </MemoryRouter>
  );
}

describe('Admin Users — filter count badge (bug 28)', () => {
  it('shows a count badge on the Filters button after a filter is selected', async () => {
    const user = userEvent.setup();
    renderUsers();

    // Wait for data to load
    await screen.findByText('Asha Rao');

    const filtersBtn = screen.getByRole('button', { name: /Filters/i });
    // No filter selected yet → no count in the button
    expect(filtersBtn).not.toHaveTextContent('1');

    // Open the filter panel and select the "active" status
    await user.click(filtersBtn);
    await user.click(screen.getByRole('button', { name: /^active$/i }));

    // The Filters button should now display the active-filter count
    expect(filtersBtn).toHaveTextContent('1');
  });
});

describe('Admin Users — action menu spacing (bugs 25/29)', () => {
  it('renders menu items using the gap-10 utility between icon and label', async () => {
    const user = userEvent.setup();
    const { container } = renderUsers();
    await screen.findByText('Asha Rao');

    // Open the row action menu (the MoreVertical trigger is the last button in the row)
    const row = screen.getByText('Asha Rao').closest('tr');
    const menuTrigger = within(row).getAllByRole('button').at(-1);
    await user.click(menuTrigger);

    const viewDetails = await screen.findByText('View Details');
    // The menu item relies on .gap-10 (now defined in index.css) for icon↔text spacing
    expect(viewDetails.closest('a, button').className).toContain('gap-10');
    expect(screen.getByText('Delete User')).toBeInTheDocument();
  });
});
