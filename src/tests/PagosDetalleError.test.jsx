import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PagosDetalle from '../views/Pagos-Detalle';

describe('PagosDetalle error', () => {
  beforeEach(() => {
    window.localStorage.setItem('role', 'USER');
    window.localStorage.setItem('authHeader', 'Bearer testtoken');
  });

  test('muestra mensaje de error si la API falla', async () => {
    global.fetch = vi.fn()
      .mockImplementationOnce(() => Promise.resolve({ ok: false, status: 500 }))
      .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }))
      .mockImplementationOnce(() => Promise.resolve({ status: 204 }));

    render(
      <MemoryRouter>
        <PagosDetalle />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText(/Error inesperado|No se pudo obtener el pago|No autorizado/i)).toBeInTheDocument();
    });
  });

  test('muestra mensaje de reembolso si existe refundInfo', async () => {
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
      expect(screen.getByText(/Motivo test/i)).toBeInTheDocument();
      expect(screen.getByText(/PENDING|Pendiente/i)).toBeInTheDocument();
    });
  });
});
