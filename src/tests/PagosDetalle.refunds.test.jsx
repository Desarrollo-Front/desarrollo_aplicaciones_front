import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import PagosDetalle from '../views/Pagos-Detalle';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Local browser API mocks
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

describe('PagosDetalle refund lifecycle (timeline events)', () => {
  afterEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  const mockPayment = (id = '10') => ({
    id,
    provider_name: 'Prestador Refund',
    amount_subtotal: 100,
    taxes: 10,
    fees: 0,
    amount_total: 110,
    currency: 'ARS',
    created_at: new Date().toISOString(),
    status: 'APPROVED',
  });

  const makeEvent = (id, type, payload = null, createdAt = new Date().toISOString()) => ({
    id,
    type,
    createdAt,
    payload: payload ? JSON.stringify(payload) : null,
  });

  test('shows REFUND_CREATED in timeline', async () => {
    const timeline = [makeEvent('e1', 'REFUND_CREATED', { amount: 50, reason: 'Cliente devolvió' })];

    global.fetch = vi.fn((url) => {
      if (url.endsWith('/timeline')) return Promise.resolve({ ok: true, json: () => Promise.resolve(timeline) });
      if (url.includes('/api/payments/')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPayment('10')) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });

    render(
      <MemoryRouter initialEntries={["/detalle/10"]}>
        <Routes>
          <Route path="/detalle/:id" element={<PagosDetalle />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText(/Reembolso creado/i)).toBeInTheDocument());
  });

  test('shows REFUND_APPROVED and REFUND_FAILED labels', async () => {
    const timeline = [
      makeEvent('e2', 'REFUND_APPROVED', { amount: 50 }),
      makeEvent('e3', 'REFUND_FAILED', { amount: 20, error: 'Saldo insuficiente' }),
    ];

    global.fetch = vi.fn((url) => {
      if (url.endsWith('/timeline')) return Promise.resolve({ ok: true, json: () => Promise.resolve(timeline) });
      if (url.includes('/api/payments/')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPayment('11')) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });

    render(
      <MemoryRouter initialEntries={["/detalle/11"]}>
        <Routes>
          <Route path="/detalle/:id" element={<PagosDetalle />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Reembolso aprobado/i)).toBeInTheDocument();
      expect(screen.getByText(/Reembolso rechazado/i)).toBeInTheDocument();
    });
  });
});
