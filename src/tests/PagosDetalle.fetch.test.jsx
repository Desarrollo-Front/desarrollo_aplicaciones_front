import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import PagosDetalle from '../views/Pagos-Detalle';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

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

describe('PagosDetalle fetch and UI', () => {
  beforeEach(() => {
    // mock fetch for payment and timeline endpoints
  global.fetch = vi.fn((url) => {
      if (url.endsWith('/timeline')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (url.includes('/api/payments/')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: '200',
              provider_name: 'Prestador Test',
              amount_subtotal: 200,
              taxes: 20,
              fees: 0,
              amount_total: 220,
              currency: 'ARS',
              created_at: new Date().toISOString(),
              status: 'APPROVED',
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  test('renders payment details and shows timeline empty state', async () => {
    render(
      <MemoryRouter initialEntries={["/detalle/200"]}>
        <Routes>
          <Route path="/detalle/:id" element={<PagosDetalle />} />
        </Routes>
      </MemoryRouter>
    );

    // wait for header with payment id
    await waitFor(() => expect(screen.getByText(/Detalle de pago #200/)).toBeInTheDocument());

    // totals should be rendered
    expect(screen.getByText(/Resumen financiero/i)).toBeInTheDocument();

    // timeline empty state
    expect(screen.getByText(/No hay eventos para mostrar/i)).toBeInTheDocument();
  });
});
