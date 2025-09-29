import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PagosDetalle from '../views/Pagos-Detalle';

describe('PagosDetalle refund error', () => {
  beforeEach(() => {
    window.localStorage.setItem('role', 'USER');
    window.localStorage.setItem('authHeader', 'Bearer testtoken');
  });

  test('muestra mensaje de error si la consulta de refund falla', async () => {
    global.fetch = vi.fn()
      .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 1, amount_total: 1000, currency: 'ARS', status: 'APPROVED' }) }))
      .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }))
      .mockImplementationOnce(() => Promise.resolve({ ok: false, status: 500 }));

    render(
      <MemoryRouter>
        <PagosDetalle />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText(/No se pudo consultar el reembolso/i)).toBeInTheDocument();
    });
  });
});
