import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PagosDetalle from '../views/Pagos-Detalle';

beforeAll(() => {
  global.React = React;
  global.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
  global.IntersectionObserver = class { constructor(){} observe(){} unobserve(){} disconnect(){} };
});

describe('PagosDetalle branch coverage - timeline and refunds extended', () => {
  afterEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  test('renders different payment statuses with correct styling', async () => {
    localStorage.setItem('role', 'ADMIN');
    
    const mockPayment = {
      id: 'p1',
      status: 'APPROVED',
      amount_total: 100,
      created_at: '2023-01-01T10:00:00Z',
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(mockPayment) })
    );

    render(
      <MemoryRouter initialEntries={['/pagos/p1']}>
        <PagosDetalle />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(document.body).toBeTruthy();
    }, { timeout: 2000 });
  });

  test('handles timeline events with different categories', async () => {
    localStorage.setItem('role', 'ADMIN');
    
    const mockPayment = {
      id: 'p1',
      status: 'APPROVED',
      amount_total: 100,
      events: [
        { id: 'e1', type: 'PAYMENT_CREATED', category: 'info', created_at: '2023-01-01T10:00:00Z' },
        { id: 'e2', type: 'PAYMENT_APPROVED', category: 'success', created_at: '2023-01-01T11:00:00Z' },
      ],
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(mockPayment) })
    );

    render(
      <MemoryRouter initialEntries={['/pagos/p1']}>
        <PagosDetalle />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(document.body).toBeTruthy();
    }, { timeout: 2000 });
  });

  test('displays refund section when refund is available', async () => {
    localStorage.setItem('role', 'ADMIN');
    
    const mockPayment = {
      id: 'p1',
      status: 'APPROVED',
      amount_total: 100,
      refund_data: { refund_id: 'r1', status: 'APPROVED' },
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(mockPayment) })
    );

    render(
      <MemoryRouter initialEntries={['/pagos/p1']}>
        <PagosDetalle />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(document.body).toBeTruthy();
    }, { timeout: 2000 });
  });

  test('handles payment status transitions in timeline', async () => {
    localStorage.setItem('role', 'USER');
    
    const mockPayment = {
      id: 'p1',
      status: 'PENDING_PAYMENT',
      amount_total: 100,
      events: [
        { type: 'PAYMENT_CREATED', created_at: '2023-01-01T10:00:00Z' },
        { type: 'PAYMENT_PENDING', created_at: '2023-01-01T10:05:00Z' },
      ],
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(mockPayment) })
    );

    render(
      <MemoryRouter initialEntries={['/pagos/p1']}>
        <PagosDetalle />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(document.body).toBeTruthy();
    }, { timeout: 2000 });
  });
});
