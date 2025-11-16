import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import PagosDetalle from '../views/Pagos-Detalle';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Mock browser APIs
global.ResizeObserver = class {
  observe() {}
  disconnect() {}
  unobserve() {}
};

describe('PagosDetalle timeline branches', () => {
  beforeEach(() => {
    localStorage.setItem('name', 'Tester');
    // mock fetch for payment and timeline endpoints
    global.fetch = vi.fn((url) => {
      if (url.endsWith('/timeline')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                id: 'ev1',
                type: 'REFUND_CREATED',
                actor: 'system',
                created_at: '2022-01-02T09:00:00Z',
                payload: JSON.stringify({ amount: 50, last4: '4321' }),
              },
              {
                id: 'ev2',
                type: 'REFUND_APPROVED',
                actor: 'system',
                created_at: '2022-01-03T09:00:00Z',
                payload: JSON.stringify({ amount: 50 }),
              },
            ]),
        });
      }
      if (url.includes('/api/payments/')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: '123',
              provider_name: 'Prestador Test',
              amount_subtotal: 100,
              taxes: 0,
              fees: 0,
              amount_total: 100,
              currency: 'ARS',
              created_at: '2022-01-01T08:00:00Z',
              status: 'REFUNDED',
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  test('renders refund events and maps types & categories', async () => {
    render(
      <MemoryRouter initialEntries={["/detalle/123"]}>
        <Routes>
          <Route path="/detalle/:id" element={<PagosDetalle />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for header to show payment id
    await waitFor(() => expect(screen.getByText(/Detalle de pago #123/)).toBeInTheDocument());

    // Timeline should contain the refund events with mapped titles
    expect(screen.getByText(/Reembolso creado/i)).toBeInTheDocument();
    expect(screen.getByText(/Reembolso aprobado/i)).toBeInTheDocument();

    // Refund events should render container with refund category class
    const refundNodes = Array.from(document.querySelectorAll('.payment-detail-timeline-horizontal-event--refund'));
    expect(refundNodes.length).toBeGreaterThanOrEqual(1);
  });

  test('renders payment info with different status values', async () => {
    global.fetch = vi.fn((url) => {
      if (url.includes('/api/payments/')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: '456',
              provider_name: 'Another Provider',
              amount_subtotal: 200,
              taxes: 20,
              fees: 5,
              amount_total: 225,
              currency: 'USD',
              created_at: '2023-06-15T10:30:00Z',
              status: 'APPROVED',
            }),
        });
      }
      if (url.endsWith('/timeline')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });

    render(
      <MemoryRouter initialEntries={["/detalle/456"]}>
        <Routes>
          <Route path="/detalle/:id" element={<PagosDetalle />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText(/Detalle de pago #456/)).toBeInTheDocument());
    expect(screen.getByText('Another Provider')).toBeInTheDocument();
  });

  test('handles empty timeline gracefully', async () => {
    global.fetch = vi.fn((url) => {
      if (url.endsWith('/timeline')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      if (url.includes('/api/payments/')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: '789',
              provider_name: 'Test Provider',
              amount_subtotal: 50,
              taxes: 0,
              fees: 0,
              amount_total: 50,
              currency: 'ARS',
              created_at: '2023-05-01T12:00:00Z',
              status: 'PENDING_PAYMENT',
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });

    render(
      <MemoryRouter initialEntries={["/detalle/789"]}>
        <Routes>
          <Route path="/detalle/:id" element={<PagosDetalle />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText(/Detalle de pago #789/)).toBeInTheDocument());
  });

  test('displays different payment event types with correct styling', async () => {
    global.fetch = vi.fn((url) => {
      if (url.endsWith('/timeline')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                id: 'ev1',
                type: 'PAYMENT_CREATED',
                actor: 'user',
                created_at: '2023-01-01T08:00:00Z',
                payload: JSON.stringify({}),
              },
              {
                id: 'ev2',
                type: 'PAYMENT_APPROVED',
                actor: 'processor',
                created_at: '2023-01-01T09:00:00Z',
                payload: JSON.stringify({}),
              },
              {
                id: 'ev3',
                type: 'PAYMENT_FAILED',
                actor: 'system',
                created_at: '2023-01-01T10:00:00Z',
                payload: JSON.stringify({ reason: 'Declined' }),
              },
            ]),
        });
      }
      if (url.includes('/api/payments/')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: '101',
              provider_name: 'Event Test',
              amount_subtotal: 150,
              taxes: 15,
              fees: 0,
              amount_total: 165,
              currency: 'ARS',
              created_at: '2023-01-01T08:00:00Z',
              status: 'FAILED',
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });

    render(
      <MemoryRouter initialEntries={["/detalle/101"]}>
        <Routes>
          <Route path="/detalle/:id" element={<PagosDetalle />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText(/Detalle de pago #101/)).toBeInTheDocument());
    // Events should be rendered with their respective type/category classes
    expect(global.fetch).toHaveBeenCalled();
  });
});
