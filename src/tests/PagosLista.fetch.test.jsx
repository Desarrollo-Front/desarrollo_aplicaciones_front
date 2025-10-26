import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import PagosLista from '../views/Pagos-Lista';
import { MemoryRouter } from 'react-router-dom';

// Mocks for browser APIs used in component
global.ResizeObserver = class {
  observe() {}
  disconnect() {}
  unobserve() {}
};
global.IntersectionObserver = class {
  constructor() {}
  observe() {}
  disconnect() {}
  unobserve() {}
};

describe('PagosLista fetch and render', () => {
  beforeEach(() => {
    // ensure no leftover storage
    localStorage.clear();
    // mock fetch for payments endpoint
  global.fetch = vi.fn((url) => {
      if (url.includes('/api/payments/my-payments')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                id: '100',
                user_name: 'Cliente A',
                provider_name: 'Prestador X',
                method: { type: 'CREDIT_CARD' },
                status: 'APPROVED',
                amount_subtotal: 500,
                taxes: 50,
                fees: 0,
                amount_total: 550,
                currency: 'ARS',
                created_at: new Date().toISOString(),
              },
            ]),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  test('renders a payment row after fetch', async () => {
    render(
      <MemoryRouter>
        <PagosLista />
      </MemoryRouter>
    );

    // wait for the row to appear
    await waitFor(() => expect(screen.getByText('#100')).toBeInTheDocument());

    expect(screen.getByText('Prestador X')).toBeInTheDocument();
    expect(screen.getByText(/Crédito/i)).toBeInTheDocument();
  // component may render the status in multiple places (badge + chip), assert at least one occurrence
  const aprobados = screen.getAllByText(/Aprobado/i);
  expect(aprobados.length).toBeGreaterThan(0);
  });

  test('logout clears localStorage', async () => {
    localStorage.setItem('auth', JSON.stringify({ role: 'USER', name: 'Test' }));
    render(
      <MemoryRouter>
        <PagosLista />
      </MemoryRouter>
    );

    // click logout
    const btn = await screen.findByRole('button', { name: /Cerrar sesión/i });
    fireEvent.click(btn);

    expect(localStorage.getItem('auth')).toBeNull();
  });
});
