import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mock the contexts BookingFlow depends on ──
const SOCIETY = {
  _id: 's1', name: 'Green Residency',
  slots: [{ slotId: 'slot1', timeWindow: '06:00 AM - 07:00 AM', maxVehicles: 20, status: 'Open' }],
};
const VEHICLE = { _id: 'v1', brand: 'Honda', model: 'City', number: 'MH01AB1234', flatNumber: '101' };
const PACKAGE = { _id: 'p1', name: 'Standard', price: 499, tier: 'STANDARD', isActive: true };

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { _id: 'u1', role: 'customer' } }) }));
vi.mock('../context/ThemeContext', () => ({ useTheme: () => ({ theme: 'dark' }) }));
vi.mock('../context/CustomerDataContext', () => ({
  useCustomerData: () => ({
    vehicles: [VEHICLE],
    packages: [PACKAGE],
    societies: [SOCIETY],
    subscriptions: [],
    settings: { prioritySlotFee: 99, trialPrice: 30 },
    discounts: [],
    loading: { vehicles: false, packages: false, societies: false },
    refreshAll: vi.fn(),
  }),
}));

import BookingFlow from '../pages/Customer/BookingFlow.jsx';

describe('Book a Service — wizard survives a page refresh (bug 94)', () => {
  beforeEach(() => { sessionStorage.clear(); });

  it('restores to the Slot step (not the Plan page) when a snapshot exists', async () => {
    // Simulate having reached the Slot step before refreshing the page
    sessionStorage.setItem('cleanzo_booking_wizard', JSON.stringify({
      step: 1,
      vehicleId: 'v1',
      packageId: 'p1',
      isTrial: false,
      societyId: 's1',
      slotId: 'slot1',
      selectedTrialDate: null,
      specialInstructions: '',
      couponCode: null,
    }));

    render(
      <MemoryRouter initialEntries={['/customer/booking']}>
        <BookingFlow />
      </MemoryRouter>
    );

    // Step 1 renders the "Select Time Slot" heading; the Plan step does not.
    await waitFor(() => {
      expect(screen.getByText('Select Time Slot')).toBeInTheDocument();
    });
  });
});
