
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PagosDetalle from '../views/Pagos-Detalle';

describe('PagosDetalle timeline', () => {
  test('muestra el timeline de eventos si hay datos', async () => {
    window.localStorage.setItem('role', 'USER');
    global.fetch = vi.fn()
      .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 1, amount_total: 1000, currency: 'ARS', status: 'APPROVED' }) }))
      .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve([
        { type: 'PAYMENT_APPROVED', created_at: '2025-09-28T10:00:00Z', payload: { amount: 1000, currency: 'ARS' } },
        { type: 'PAYMENT_CAPTURED', created_at: '2025-09-28T10:05:00Z', payload: { amount: 1000, currency: 'ARS' } }
      ]) }))
    ;
    render(
      <MemoryRouter>
        <PagosDetalle />
      </MemoryRouter>
    );
    expect(await screen.findByText(/Pago aprobado/i)).toBeInTheDocument();
    expect(await screen.findByText(/Pago capturado/i)).toBeInTheDocument();
  });
});
