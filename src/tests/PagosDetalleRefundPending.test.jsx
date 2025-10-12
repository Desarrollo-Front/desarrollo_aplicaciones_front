import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PagosDetalle from '../views/Pagos-Detalle';

describe('PagosDetalle refund pendiente', () => {
  beforeEach(() => {
    window.localStorage.setItem('role', 'USER');
    window.localStorage.setItem('authHeader', 'Bearer testtoken');
  });

  test('muestra refund pendiente si refundInfo.status es PENDING', async () => {
    global.fetch = vi.fn()
      .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 1, amount_total: 1000, currency: 'ARS', status: 'APPROVED' }) }))
      .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }))
      .mockImplementationOnce(() => Promise.resolve({ ok: true, text: () => Promise.resolve('{"id":2,"amount":500,"status":"PENDING","reason":"Motivo test"}') }));

    render(
      <MemoryRouter>
        <PagosDetalle />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText(/Pendiente/i)).toBeInTheDocument();
      expect(screen.getByText(/Motivo test/i)).toBeInTheDocument();
    });
  });
});
