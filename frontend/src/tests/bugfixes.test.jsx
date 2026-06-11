import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// Passthrough the image optimizer so file handling doesn't need canvas/Image in jsdom.
vi.mock('../utils/imageOptimizer', () => ({
  optimizeImage: vi.fn(async (file) => file),
}));

import { ThemeProvider } from '../context/ThemeContext.jsx';
import JoinAsCleaner from '../pages/Landing/JoinAsCleaner.jsx';
import PhotoUpload from '../pages/Cleaner/PhotoUpload.jsx';

beforeAll(() => {
  // jsdom doesn't implement these — components touch them indirectly.
  if (!window.matchMedia) {
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  }
  if (!URL.createObjectURL) URL.createObjectURL = () => 'blob:mock';
});

const renderCrew = () =>
  render(
    <MemoryRouter>
      <ThemeProvider>
        <JoinAsCleaner />
      </ThemeProvider>
    </MemoryRouter>
  );

describe('Crew application — input sanitization (bugs 5, 6, 7)', () => {
  it('strips special characters/digits from Full Name', async () => {
    const user = userEvent.setup();
    renderCrew();
    const name = screen.getByPlaceholderText('John Doe');
    await user.type(name, 'Jo@hn#1 Doe');
    expect(name.value).toBe('John Doe');
  });

  it('strips letters and caps Mobile Number at 10 digits', async () => {
    const user = userEvent.setup();
    renderCrew();
    const phone = screen.getByPlaceholderText('10-digit number');
    await user.type(phone, '98ab76543210999');
    expect(phone.value).toBe('9876543210');
    expect(phone).toHaveAttribute('maxLength', '10');
  });

  it("strips special characters from Father's Name", async () => {
    const user = userEvent.setup();
    renderCrew();
    const father = screen.getByPlaceholderText('Legal Name');
    await user.type(father, 'Ram@123 Kumar!');
    expect(father.value).toBe('Ram Kumar');
  });
});

describe('Crew application — step validation (bugs 6, 11)', () => {
  async function fillStep1({ user, phone }) {
    await user.type(screen.getByPlaceholderText('John Doe'), 'Test User');
    await user.type(screen.getByPlaceholderText('10-digit number'), phone);
    await user.type(screen.getByPlaceholderText('25'), '25');
    await user.type(screen.getByPlaceholderText('Legal Name'), 'Father Name');
    await user.type(screen.getByPlaceholderText('Flat no, Building, Area...'), 'Current address line');
    await user.type(screen.getByPlaceholderText('As per Aadhaar card...'), 'Permanent address line');
  }

  it('rejects a phone shorter than 10 digits', async () => {
    const user = userEvent.setup();
    renderCrew();
    await fillStep1({ user, phone: '98765' });
    await user.click(screen.getByRole('button', { name: /continue/i }));
    expect(await screen.findByText(/valid 10-digit mobile number/i)).toBeInTheDocument();
  });

  it('advances to Identity Documents with valid data, where doc inputs accept images (bug 9)', async () => {
    const user = userEvent.setup();
    const { container } = renderCrew();
    await fillStep1({ user, phone: '9876543210' });
    await user.click(screen.getByRole('button', { name: /continue/i }));

    // Now on step 2
    expect(await screen.findByText(/Identity Documents/i)).toBeInTheDocument();
    const fileInputs = container.querySelectorAll('input[type="file"]');
    expect(fileInputs.length).toBeGreaterThan(0);
    fileInputs.forEach((input) => expect(input).toHaveAttribute('accept', 'image/*'));
  });
});

describe('Cleaner task photo — camera capture (bug 20)', () => {
  it('uses capture="environment" so the camera opens on mobile', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/cleaner/upload?taskId=abc123&type=before']}>
        <PhotoUpload />
      </MemoryRouter>
    );
    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).toHaveAttribute('accept', 'image/*');
    expect(fileInput).toHaveAttribute('capture', 'environment');
  });
});
