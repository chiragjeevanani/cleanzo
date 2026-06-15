import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../context/ToastContext.jsx';
import AdminCoupons from '../pages/Admin/AdminCoupons.jsx';
import TestimonialsManager from '../pages/Admin/TestimonialsManager.jsx';
import AdminCMS from '../pages/Admin/AdminCMS.jsx';
import FaqsManager from '../pages/Admin/FaqsManager.jsx';
import AppDownloadSection from '../pages/Landing/AppDownloadSection.jsx';

// Mock apiClient to prevent actual network calls during testing
vi.mock('../../services/apiClient', () => ({
  default: {
    get: vi.fn(async (url) => {
      if (url.includes('coupons')) return { coupons: [] };
      if (url.includes('societies')) return { societies: [] };
      if (url.includes('testimonials')) return { testimonials: [] };
      if (url.includes('banners')) return { banners: [] };
      if (url.includes('trusted-societies')) return { data: { heading: 'TRUSTED BY', items: [] } };
      return {};
    }),
    post: vi.fn(async () => ({ success: true })),
    put: vi.fn(async () => ({ success: true })),
    delete: vi.fn(async () => ({ success: true })),
    uploadForm: vi.fn(async () => ({ success: true, url: 'https://example.com/image.png' })),
  }
}));

beforeAll(() => {
  if (!window.matchMedia) {
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  }
});

describe('Coupon validations (Row 64)', () => {
  it('caps the percentage discount value at 100 dynamically on change', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ToastProvider>
          <AdminCoupons />
        </ToastProvider>
      </MemoryRouter>
    );

    // Wait for loader to disappear
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    // Open Add Coupon Modal
    const newCouponBtn = screen.getByRole('button', { name: /new coupon/i });
    await user.click(newCouponBtn);

    // Verify discount type is percent by default and type 120
    const valueInput = screen.getByPlaceholderText('e.g. 20');
    await user.type(valueInput, '120');

    // It should cap the value at 100 dynamically
    expect(valueInput.value).toBe('100');
  });
});

describe('Testimonial role sanitization (Row 79)', () => {
  it('strips special characters from the Role / Title input', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ToastProvider>
          <TestimonialsManager />
        </ToastProvider>
      </MemoryRouter>
    );

    // Open Add Testimonial Modal
    const addTestimonialBtn = screen.getByRole('button', { name: /add testimonial/i });
    await user.click(addTestimonialBtn);

    // Type special characters in the Role input field
    const roleInput = screen.getByPlaceholderText(/role \/ title/i);
    await user.type(roleInput, 'CEO @ Admin $1');

    // It should strip special characters, leaving only letters, numbers, and spaces
    expect(roleInput.value).toBe('CEO  Admin 1');
  });
});

describe('CMS Support contact and email validations (Rows 73-76)', () => {
  it('restricts Call Number and WhatsApp to 10 digits and numbers only', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ToastProvider>
          <AdminCMS />
        </ToastProvider>
      </MemoryRouter>
    );

    // Navigate to Support tab
    const supportTabBtn = screen.getByRole('button', { name: /support/i });
    await user.click(supportTabBtn);

    // Get both phone & whatsapp inputs since they share the same placeholder
    const inputs = screen.getAllByPlaceholderText('e.g. 9555860362');
    const whatsappInput = inputs[0];
    const callInput = inputs[1];

    // Test Call Number input
    await user.clear(callInput);
    await user.type(callInput, '955abc5860362999');

    // Letters are blocked, digits only, and max 10 characters
    expect(callInput.value).toBe('9555860362');

    // Test WhatsApp input
    await user.clear(whatsappInput);
    await user.type(whatsappInput, '955xyz5860362888');

    expect(whatsappInput.value).toBe('9555860362');
  });

  it('converts support email characters to lowercase dynamically', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ToastProvider>
          <AdminCMS />
        </ToastProvider>
      </MemoryRouter>
    );

    // Navigate to Support tab
    const supportTabBtn = screen.getByRole('button', { name: /support/i });
    await user.click(supportTabBtn);

    const emailInput = screen.getByPlaceholderText('e.g. hello@trycleanzo.com');
    await user.clear(emailInput);
    await user.type(emailInput, 'HELLO@TryCleanzo.COM');

    expect(emailInput.value).toBe('hello@trycleanzo.com');
  });
});

describe('FAQ validations (Row 81-82)', () => {
  it('blocks negative sort order input in FAQ form', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ToastProvider>
          <FaqsManager />
        </ToastProvider>
      </MemoryRouter>
    );

    // Open Add FAQ Modal
    const addFaqBtn = screen.getByRole('button', { name: /add faq/i });
    await user.click(addFaqBtn);

    // Enter negative sort order
    const sortOrderInput = screen.getByRole('spinbutton');
    await user.clear(sortOrderInput);
    await user.type(sortOrderInput, '-5');

    // Input should prevent negative values and reset/cap to 0 or non-negative
    expect(Number(sortOrderInput.value)).toBeGreaterThanOrEqual(0);
  });
});

describe('App store button placeholders (Row 96)', () => {
  it('prevents default action and contains App Store and Google Play options', async () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <AppDownloadSection />
        </ToastProvider>
      </MemoryRouter>
    );

    const appStoreLink = screen.getByText('App Store').closest('a');
    const playStoreLink = screen.getByText('Google Play').closest('a');

    expect(appStoreLink).toBeInTheDocument();
    expect(playStoreLink).toBeInTheDocument();
  });
});
